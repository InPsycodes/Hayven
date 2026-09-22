import { notFound, redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReportView } from "@/components/therapy-session/report-view";
import { getSession } from "@/lib/auth/session";
import { getSupervisedChildById } from "@/lib/supervisor/queries";
import { getReportForSessionAsSupervisor } from "@/lib/reports/queries";
import { renderReportBody } from "@/lib/reports/generate";

export default async function SupervisorTherapySessionPage({
  params,
}: {
  params: Promise<{ childId: string; sessionId: string }>;
}) {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    redirect("/login");
  }

  const { childId, sessionId } = await params;
  const child = await getSupervisedChildById(childId, session.userId);
  if (!child) notFound();

  const report = await getReportForSessionAsSupervisor(sessionId, session.userId);
  if (!report) notFound();

  return (
    <div>
      <DashboardHeader session={session} greeting="Session report" subtext={child.firstName} />
      <div className="flex flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        <StatusBadge tone="grey" className="w-fit px-3 py-1 text-xs">
          Oversight view &middot; read-only
        </StatusBadge>
        {report.therapistBody ? (
          <Card lift className="p-5">
            <ReportView body={renderReportBody(report.therapistBody, child.firstName)} />
          </Card>
        ) : (
          <StatusBadge tone="error" className="w-fit px-3 py-1 text-xs">
            This report failed to generate.
          </StatusBadge>
        )}
      </div>
    </div>
  );
}
