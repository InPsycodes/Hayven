import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getSupervisedChildrenForTherapist } from "@/lib/supervisor/queries";
import { ageFromDob, initialsFromName } from "@/data/format";

export default async function SupervisorTherapistChildrenPage({
  params,
}: {
  params: Promise<{ therapistId: string }>;
}) {
  const session = await getSession();
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const { therapistId } = await params;
  const children = await getSupervisedChildrenForTherapist(therapistId, session.userId);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Assigned children"
        subtext={`${children.length} ${children.length === 1 ? "child" : "children"}`}
      />
      <div className="px-5 py-6 md:px-10 md:py-8">
        {children.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No children assigned to this therapist yet, or they&apos;re not on your team.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/supervisor/children/${child.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-paper/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-medium text-charcoal">
                      {initialsFromName(child.firstName)}
                    </span>
                    <p className="truncate text-sm font-medium text-charcoal">{child.firstName}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{ageFromDob(child.dateOfBirth)}</p>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
