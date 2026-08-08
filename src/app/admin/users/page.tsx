import { AssignPicker } from "@/components/care-team/assign-picker";
import { AssignmentRow } from "@/components/care-team/assignment-row";
import {
  getAllChildrenForAdmin,
  getAllSupervisorsForAdmin,
  getAllTherapistsForAdmin,
  getActiveSupervisorAssignments,
  getActiveTherapistChildAssignments,
} from "@/lib/admin/queries";
import {
  assignSupervisorToTherapist,
  assignTherapistToChild,
  endSupervisorAssignment,
  endTherapistChildAssignment,
} from "@/lib/admin/actions";

export default async function AdminUsersPage() {
  const [therapists, children, supervisors, therapistChildAssignments, supervisorAssignments] = await Promise.all([
    getAllTherapistsForAdmin(),
    getAllChildrenForAdmin(),
    getAllSupervisorsForAdmin(),
    getActiveTherapistChildAssignments(),
    getActiveSupervisorAssignments(),
  ]);

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F6F4F0]">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who&apos;s treating which child, and who supervises which therapist.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] md:p-6">
          <h2 className="label-micro text-terracotta">Care team</h2>
          <h3 className="mt-1 font-heading text-lg text-charcoal">Therapist &amp; child assignments</h3>

          <div className="mt-5">
            <AssignPicker
              leftLabel="Therapist"
              leftOptions={therapists}
              rightLabel="Child"
              rightOptions={children}
              submitLabel="Assign"
              onSubmit={(therapistId, childId) => assignTherapistToChild(therapistId, childId)}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {therapistChildAssignments.length === 0 ? (
              <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">No active assignments yet.</p>
            ) : (
              therapistChildAssignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  fromName={a.therapistName}
                  toName={a.childName}
                  detail={a.therapyType}
                  startedOn={a.startedOn}
                  assignmentId={a.id}
                  onEnd={endTherapistChildAssignment}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] md:p-6">
          <h2 className="label-micro text-terracotta">Oversight</h2>
          <h3 className="mt-1 font-heading text-lg text-charcoal">Supervisor &amp; therapist assignments</h3>

          <div className="mt-5">
            <AssignPicker
              leftLabel="Supervisor"
              leftOptions={supervisors}
              rightLabel="Therapist"
              rightOptions={therapists}
              submitLabel="Assign"
              onSubmit={(supervisorId, therapistId) => assignSupervisorToTherapist(supervisorId, therapistId)}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {supervisorAssignments.length === 0 ? (
              <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">
                No active supervisor assignments yet.
              </p>
            ) : (
              supervisorAssignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  fromName={a.supervisorName}
                  toName={a.therapistName}
                  startedOn={a.startedOn}
                  assignmentId={a.id}
                  onEnd={endSupervisorAssignment}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
