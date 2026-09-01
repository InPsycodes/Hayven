import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getAssignedChildren } from "@/lib/therapy-sessions/queries";
import { ageFromDob } from "@/data/format";

export default async function TherapistCaseloadPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const children = await getAssignedChildren(therapist.id);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Caseload"
        subtext={`${children.length} ${children.length === 1 ? "child" : "children"} assigned to you`}
      />

      <div className="px-5 py-6 md:px-10 md:py-8">
        {children.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No children assigned yet. An assignment is created automatically once you have a
            confirmed booking with a family.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {children.map((child) => (
                <div key={child.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <Link href={`/therapist/children/${child.id}`} className="hover:opacity-80">
                    <p className="text-sm font-medium text-charcoal">
                      {child.firstName}, {ageFromDob(child.dateOfBirth)}
                    </p>
                    <p className="text-xs text-muted-foreground">View progress</p>
                  </Link>
                  <Link
                    href={`/therapist/children/${child.id}/sessions/new`}
                    className="rounded-full bg-terracotta px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-terracotta/90"
                  >
                    Log a session
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
