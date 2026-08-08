"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { logAuditEvent } from "@/lib/audit/log";
import { getGenerationInput } from "./queries";
import { generateParentReport, generateTherapistReport } from "./generate";
import type { ReportBody } from "./types";

/** Defense in depth -- RLS already blocks a cross-tenant write, but every other action in this file re-checks ownership explicitly, and these two should too. Returns the report's child_id when owned (also handy for audit logging), or null. */
async function reportBelongsToTherapist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  therapistId: string
): Promise<string | null> {
  const { data: report } = await supabase.from("reports").select("session_id").eq("id", reportId).maybeSingle();
  if (!report) return null;
  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select("child_id")
    .eq("id", report.session_id)
    .eq("therapist_id", therapistId)
    .maybeSingle();
  return therapySession?.child_id ?? null;
}

export async function generateReport(
  sessionId: string
): Promise<{ ok: true; reportId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "You must be signed in as a therapist." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) {
    return { ok: false, error: "Finish setting up your profile first." };
  }

  const supabase = await createClient();

  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select("id, therapist_id, child_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession || therapySession.therapist_id !== therapist.id) {
    return { ok: false, error: "Session not found." };
  }

  // Don't spawn duplicate reports for the same session -- if one already
  // exists, just hand back its id.
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return { ok: true, reportId: existing.id };

  const input = await getGenerationInput(sessionId);
  if (!input) return { ok: false, error: "Couldn't load session data." };

  const startedAt = Date.now();
  const therapistBody = generateTherapistReport(input);
  const parentBody = generateParentReport(input);
  const generationMs = Date.now() - startedAt;

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      session_id: sessionId,
      status: "draft",
      therapist_body: therapistBody,
      parent_body: parentBody,
      model_version: "rule-based-v1",
      generation_ms: generationMs,
      input_snapshot: input,
      requested_by: session.userId,
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !report) {
    return { ok: false, error: error?.message ?? "Couldn't save the generated report." };
  }

  await logAuditEvent({
    actor: session,
    action: "report.generate",
    entityType: "report",
    entityId: report.id,
    childId: therapySession.child_id,
  });

  revalidatePath(`/therapist/children`);
  return { ok: true, reportId: report.id };
}

export async function saveReport(
  reportId: string,
  therapistBody: ReportBody
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "Not authorized." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const childId = await reportBelongsToTherapist(supabase, reportId, therapist.id);
  if (!childId) {
    return { ok: false, error: "Report not found." };
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ therapist_body: therapistBody })
    .eq("id", reportId)
    .select("id, published_at")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Report not found." };

  // Editing a report that's already been shown to a parent doesn't change
  // what the parent sees (parent_body is independent), but it does mean the
  // parent's copy may no longer match the therapist's latest thinking --
  // flag it for a deliberate re-publish rather than silently drifting.
  if (data.published_at) {
    await supabase.from("reports").update({ status: "in_review" }).eq("id", reportId);
  }

  await logAuditEvent({ actor: session, action: "report.save", entityType: "report", entityId: reportId, childId });

  revalidatePath(`/therapist/children`);
  return { ok: true };
}

/** Publishes for the first time, or re-publishes after an edit -- either way this is the therapist's explicit sign-off that the parent should see the current state. */
export async function publishReport(reportId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "Not authorized." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const supabase = await createClient();
  const childId = await reportBelongsToTherapist(supabase, reportId, therapist.id);
  if (!childId) {
    return { ok: false, error: "Report not found." };
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ status: "published", published_at: new Date().toISOString(), approved_by: session.userId, approved_at: new Date().toISOString() })
    .eq("id", reportId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Report not found." };

  await logAuditEvent({ actor: session, action: "report.publish", entityType: "report", entityId: reportId, childId });

  revalidatePath(`/therapist/children`);
  return { ok: true };
}
