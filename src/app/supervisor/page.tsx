import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getMySupervisedTherapists } from "@/lib/supervisor/queries";
import { initialsFromName } from "@/data/format";

export default async function SupervisorTeamPage() {
  const session = await getSession();
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const therapists = await getMySupervisedTherapists(session.userId);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Your team"
        subtext={`${therapists.length} ${therapists.length === 1 ? "therapist" : "therapists"} on your team`}
      />
      <div className="px-5 py-6 md:px-10 md:py-8">
        {therapists.length === 0 ? (
          <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground ring-1 ring-border">
            No therapists are assigned to you yet. An admin can set this up from the Assignments page.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {therapists.map((t) => (
                <Link
                  key={t.id}
                  href={`/supervisor/therapists/${t.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-paper/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-medium text-charcoal">
                      {initialsFromName(t.name)}
                    </span>
                    <p className="truncate text-sm font-medium text-charcoal">{t.name}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {t.childCount} {t.childCount === 1 ? "child" : "children"}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
