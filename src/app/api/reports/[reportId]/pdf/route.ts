import { type NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { logAuditEvent } from "@/lib/audit/log";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { renderReportBody } from "@/lib/reports/generate";
import { renderReportPdf, type ReportPdfVersion } from "@/lib/reports/pdf";
import type { ReportBody } from "@/lib/reports/types";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () => NextResponse.json({ error: "Report not found." }, { status: 404 });

function fileName(childName: string, sessionDate: string | null, version: ReportPdfVersion): string {
  const who = childName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = sessionDate ? sessionDate.slice(0, 10) : "report";
  return `Hayven-${who || "child"}-${date}-${version === "clinical" ? "clinical-report" : "progress-report"}.pdf`;
}

/**
 * PDF download of one report. The clinical version (the therapist's own
 * report) is available to the therapist who wrote it and to a supervisor
 * actively overseeing them; the parent version is available to that
 * therapist and, once published, to the child's parent. Every download is written to the audit log, and the PDF itself
 * carries a confidentiality footer naming who downloaded it.
 *
 * Owns its own auth: src/proxy.ts's matcher excludes /api, and therapist_body
 * is select-revoked from `authenticated` (migration 0017), so the therapist
 * path reads through the service-role client after re-checking ownership.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  if (!UUID.test(reportId)) return notFound();

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (session.role !== "therapist" && session.role !== "parent") {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const requested = request.nextUrl.searchParams.get("version");
  const version: ReportPdfVersion =
    session.role === "parent" ? "parent" : requested === "parent" ? "parent" : "clinical";
  if (session.role === "parent" && requested === "clinical") {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const allowed = await checkRateLimit(`report-pdf:${session.userId}`, 20, 60);
  if (!allowed) return NextResponse.json({ error: "Too many downloads. Please wait a minute." }, { status: 429 });

  const admin = createAdminClient();
  let sessionId: string;
  let body: ReportBody | null;
  let viaSupervision = false;

  if (session.role === "therapist") {
    const { data: report } = await admin
      .from("reports")
      .select("session_id, therapist_body, parent_body")
      .eq("id", reportId)
      .maybeSingle();
    if (!report) return notFound();
    const { data: reportSession } = await admin
      .from("therapy_sessions")
      .select("therapist_id")
      .eq("id", report.session_id)
      .maybeSingle();
    if (!reportSession) return notFound();

    const therapist = await getRealTherapistProfileByUserId(session.userId);
    const isAuthor = therapist?.id === reportSession.therapist_id;
    if (!isAuthor) {
      // A supervisor may download the clinical report of a therapist they
      // actively supervise -- the same, read-only view their oversight page
      // shows -- and nothing else.
      if (!session.isSupervisor) return notFound();
      const { data: supervision } = await admin
        .from("supervisor_assignments")
        .select("id")
        .eq("supervisor_id", session.userId)
        .eq("therapist_id", reportSession.therapist_id)
        .eq("status", "active")
        .maybeSingle();
      if (!supervision) return notFound();
      if (version !== "clinical") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
      viaSupervision = true;
    }
    sessionId = report.session_id;
    body = (version === "clinical" ? report.therapist_body : report.parent_body) as ReportBody | null;
  } else {
    // Parent: read through the caller's own RLS-bound client so the same
    // rules that gate the Progress reports page (published only, own child,
    // consent) gate the download.
    const supabase = await createClient();
    const { data: report } = await supabase
      .from("reports")
      .select("session_id, parent_body, published_at")
      .eq("id", reportId)
      .not("published_at", "is", null)
      .maybeSingle();
    if (!report) return notFound();
    sessionId = report.session_id;
    body = report.parent_body as ReportBody | null;
  }
  if (!body) return notFound();

  const { data: therapySession } = await admin
    .from("therapy_sessions")
    .select("session_date, child_id, therapist_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession) return notFound();

  const { data: child } = await admin
    .from("children")
    .select("first_name, parent_id")
    .eq("id", therapySession.child_id)
    .maybeSingle();
  if (!child) return notFound();
  if (session.role === "parent" && child.parent_id !== session.userId) return notFound();

  const { data: therapistProfile } = await admin
    .from("therapist_profiles")
    .select("user_id")
    .eq("id", therapySession.therapist_id)
    .maybeSingle();
  const { data: therapistUser } = therapistProfile
    ? await admin.from("users").select("full_name").eq("id", therapistProfile.user_id).maybeSingle()
    : { data: null };
  const { data: parentUser } =
    version === "parent" ? await admin.from("users").select("full_name").eq("id", child.parent_id).maybeSingle() : { data: null };

  const pdf = await renderReportPdf({
    body: renderReportBody(body, child.first_name),
    version,
    childName: child.first_name,
    sessionDate: therapySession.session_date,
    therapistName: therapistUser?.full_name ?? null,
    downloadedBy: session.name,
    preparedFor: parentUser?.full_name ?? null,
  });

  await logAuditEvent({
    actor: session,
    action: "report.download",
    entityType: "report",
    entityId: reportId,
    childId: therapySession.child_id,
    metadata: viaSupervision ? { version, as: "supervisor" } : { version },
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(child.first_name, therapySession.session_date, version)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
