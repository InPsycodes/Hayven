import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { AssignPicker } from "@/components/care-team/assign-picker";
import { AssignmentRow } from "@/components/care-team/assignment-row";
import { getSession } from "@/lib/auth/session";
import {
  getMySupervisedTherapists,
  getMyTeamAssignments,
  getChildrenEligibleForSupervisorAssignment,
} from "@/lib/supervisor/queries";
import { assignChildToTherapist, endTherapistChildAssignmentAsSupervisor } from "@/lib/supervisor/actions";

export default async function SupervisorAssignmentsPage() {
  const session = await getSession();
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const [therapists, children, teamAssignments] = await Promise.all([
    getMySupervisedTherapists(session.userId),
    getChildrenEligibleForSupervisorAssignment(),
    getMyTeamAssignments(session.userId),
  ]);

  return (
    <div>
      <DashboardHeader session={session} greeting="Team assignments" subtext="Assign your therapists to children" />
      <div className="flex flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        {therapists.length === 0 ? (
          <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground ring-1 ring-border">
            No therapists are assigned to you yet.
          </p>
        ) : (
          <Card lift className="p-5">
            <AssignPicker
              leftLabel="Therapist"
              leftOptions={therapists.map((t) => ({ id: t.id, label: t.name }))}
              rightLabel="Child"
              rightOptions={children}
              submitLabel="Assign"
              onSubmit={assignChildToTherapist}
            />

            <div className="mt-5 flex flex-col gap-2">
              {teamAssignments.length === 0 ? (
                <p className="rounded-sm bg-paper/40 p-4 text-sm text-muted-foreground">
                  No active assignments for your team yet.
                </p>
              ) : (
                teamAssignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    fromName={a.therapistName}
                    toName={a.childName}
                    detail={a.therapyType}
                    startedOn={a.startedOn}
                    assignmentId={a.id}
                    onEnd={endTherapistChildAssignmentAsSupervisor}
                  />
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
