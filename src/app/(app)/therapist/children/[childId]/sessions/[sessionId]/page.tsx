import { notFound, redirect } from "next/navigation";
import { IconLock } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { GenerateReportButton } from "@/components/therapy-session/generate-report-button";
import { ParentPreviewPanel } from "@/components/therapy-session/parent-preview-panel";
import { ReportPanel } from "@/components/therapy-session/report-panel";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getReportForSession } from "@/lib/reports/queries";
import { renderReportBody } from "@/lib/reports/generate";
import { getConfidentialNote } from "@/lib/therapy-sessions/confidential";
import { formatDate } from "@/data/format";

export default async function TherapySessionPage({
  params,
}: {
  params: Promise<{ childId: string; sessionId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) notFound();

  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select("id, session_date, duration_minutes, setting, therapist_notes, children(first_name)")
    .eq("id", sessionId)
    .eq("therapist_id", therapist.id)
    .maybeSingle();

  if (!therapySession) notFound();
  const child = therapySession.children as unknown as { first_name: string } | null;
  const childName = child?.first_name ?? "the child";

  const report = await getReportForSession(sessionId, therapist.id);
  const confidentialNote = await getConfidentialNote(sessionId, therapist.id);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Session report"
        subtext={`${childName} · ${formatDate(therapySession.session_date)}`}
      />
      <div className="flex flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        <div className="rounded-sm bg-white p-5 ring-1 ring-border">
          <p className="text-sm text-charcoal">
            {therapySession.duration_minutes ?? "?"} min, {therapySession.setting?.replace("_", " ")}
          </p>
          {therapySession.therapist_notes && (
            <p className="mt-2 text-sm text-muted-foreground">{therapySession.therapist_notes}</p>
          )}
        </div>

        {confidentialNote && (
          <div className="rounded-sm border border-terracotta/30 bg-terracotta/5 p-5">
            <p className="label-micro flex items-center gap-1.5 text-terracotta">
              <IconLock size={12} stroke={2} />
              Confidential &middot; internal only
            </p>
            <p className="mt-2 text-sm text-charcoal">{confidentialNote}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Visible only to therapists assigned to this child. Never shared with the parent or the report generator.
            </p>
          </div>
        )}

        {!report ? (
          <GenerateReportButton sessionId={sessionId} />
        ) : report.therapistBody ? (
          <>
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-base font-semibold text-charcoal">Clinical report</h2>
              <ReportPanel reportId={report.id} body={renderReportBody(report.therapistBody, childName)} />
            </div>
            {report.parentBody && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <h2 className="font-serif text-base font-semibold text-charcoal">Parent preview</h2>
                <ParentPreviewPanel
                  reportId={report.id}
                  body={renderReportBody(report.parentBody, childName)}
                  status={report.status}
                  publishedAt={report.publishedAt}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-error">This report failed to generate. Please try again.</p>
        )}
      </div>
    </div>
  );
}
