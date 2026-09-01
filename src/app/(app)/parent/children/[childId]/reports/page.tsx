import { notFound, redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { ReportView } from "@/components/therapy-session/report-view";
import { getSession } from "@/lib/auth/session";
import { getRealChildById } from "@/lib/parent/queries";
import { getPublishedReportsForChild } from "@/lib/reports/queries";
import { renderReportBody } from "@/lib/reports/generate";
import { markReportNotificationsRead } from "@/lib/notifications/actions";
import { formatDate } from "@/data/format";

export default async function ParentChildReportsPage({ params }: { params: Promise<{ childId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  const { childId } = await params;
  const child = await getRealChildById(childId);
  if (!child || child.parentId !== session.userId) notFound();

  const reports = await getPublishedReportsForChild(childId);
  await markReportNotificationsRead();

  return (
    <div>
      <DashboardHeader session={session} greeting="Progress reports" subtext={child.firstName} />
      <div className="flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        {reports.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No progress reports have been shared yet. Your child&apos;s therapist will publish one after a session.
          </p>
        ) : (
          reports.map((report, i) => (
            <Card key={report.id} lift={i === 0} className="p-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Shared {formatDate(report.publishedAt)}
              </p>
              <ReportView body={renderReportBody(report.parentBody, child.firstName)} />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
