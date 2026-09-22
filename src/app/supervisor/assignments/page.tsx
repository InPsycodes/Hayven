import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { AssignPicker } from "@/components/care-team/assign-picker";
import { AssignmentRow } from "@/components/care-team/assignment-row";
import { LapsedAssignmentRow } from "@/components/care-team/lapsed-assignment-row";
import { getSession } from "@/lib/auth/session";
import {
  getMySupervisedTherapists,
  getMyTeamAssignments,
  getMyLapsedTeamAssignments,
  getChildrenEligibleForSupervisorAssignment,
} from "@/lib/supervisor/queries";
import {
  assignChildToTherapist,
  endTherapistChildAssignmentAsSupervisor,
  renewTherapistChildAssignmentAsSupervisor,
} from "@/lib/supervisor/actions";

export default async function SupervisorAssignmentsPage() {
  const session = await getSession();
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const [therapists, children, teamAssignments, lapsedTeamAssignments] = await Promise.all([
    getMySupervisedTherapists(session.userId),
    getChildrenEligibleForSupervisorAssignment(),
    getMyTeamAssignments(session.userId),
    getMyLapsedTeamAssignments(session.userId),
  ]);

  return (
    <div>
      <DashboardHeader session={session} greeting="Team assignments" subtext="Assign your therapists to children" />
      <div className="flex flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        {therapists.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
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

        {lapsedTeamAssignments.length > 0 && (
          <Card lift className="p-5">
            <h3 className="font-heading text-base text-charcoal">Lapsed assignments</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ended manually, or auto-expired after 90 days with no recorded session. Renew if care is
              continuing.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {lapsedTeamAssignments.map((a) => (
                <LapsedAssignmentRow
                  key={a.id}
                  fromName={a.therapistName}
                  toName={a.childName}
                  detail={a.therapyType}
                  startedOn={a.startedOn}
                  endedOn={a.endedOn}
                  endedReason={a.endedReason}
                  assignmentId={a.id}
                  onRenew={renewTherapistChildAssignmentAsSupervisor}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
