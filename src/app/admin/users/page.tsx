import { AssignPicker } from "@/components/care-team/assign-picker";
import { AssignmentRow } from "@/components/care-team/assignment-row";
import { LapsedAssignmentRow } from "@/components/care-team/lapsed-assignment-row";
import { ReassignChildRow } from "@/components/care-team/reassign-child-row";
import { SupervisorRequestRow } from "@/components/admin/supervisor-request-row";
import {
  getAllChildrenForAdmin,
  getAllSupervisorsForAdmin,
  getAllTherapistsForAdmin,
  getActiveSupervisorAssignments,
  getActiveTherapistChildAssignments,
  getLapsedTherapistChildAssignments,
  getChildrenNeedingReassignment,
  getSupervisorRequests,
} from "@/lib/admin/queries";
import {
  assignSupervisorToTherapist,
  assignTherapistToChild,
  endSupervisorAssignment,
  endTherapistChildAssignment,
  renewTherapistChildAssignment,
} from "@/lib/admin/actions";

export default async function AdminUsersPage() {
  const [
    therapists,
    children,
    supervisors,
    therapistChildAssignments,
    lapsedTherapistChildAssignments,
    childrenNeedingReassignment,
    supervisorAssignments,
    supervisorRequests,
  ] = await Promise.all([
    getAllTherapistsForAdmin(),
    getAllChildrenForAdmin(),
    getAllSupervisorsForAdmin(),
    getActiveTherapistChildAssignments(),
    getLapsedTherapistChildAssignments(),
    getChildrenNeedingReassignment(),
    getActiveSupervisorAssignments(),
    getSupervisorRequests(),
  ]);
  const pendingSupervisorRequests = supervisorRequests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who&apos;s treating which child, and who supervises which therapist.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <h2 className="label-micro text-rust-dark">Care team</h2>
          <h3 className="mt-1 font-heading text-lg text-charcoal">Therapist &amp; child assignments</h3>

          <div className="mt-5">
            <AssignPicker
              leftLabel="Therapist"
              leftOptions={therapists}
              rightLabel="Child"
              rightOptions={children}
              submitLabel="Assign"
              onSubmit={assignTherapistToChild}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {therapistChildAssignments.length === 0 ? (
              <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">No active assignments yet.</p>
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

        {childrenNeedingReassignment.length > 0 && (
          <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
            <h2 className="label-micro text-rust-dark">Care team</h2>
            <h3 className="mt-1 font-heading text-lg text-charcoal">Needs reassignment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These children&apos;s therapist was offboarded and no one else is currently assigned.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {childrenNeedingReassignment.map((c) => (
                <ReassignChildRow
                  key={c.childId}
                  childId={c.childId}
                  childName={c.childName}
                  previousTherapistName={c.previousTherapistName}
                  endedOn={c.endedOn}
                  therapistOptions={therapists}
                  onAssign={assignTherapistToChild}
                />
              ))}
            </div>
          </section>
        )}

        {lapsedTherapistChildAssignments.length > 0 && (
          <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
            <h2 className="label-micro text-rust-dark">Care team</h2>
            <h3 className="mt-1 font-heading text-lg text-charcoal">Lapsed assignments</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ended manually, or auto-expired after 90 days with no recorded session. Renew if care is
              continuing.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {lapsedTherapistChildAssignments.map((a) => (
                <LapsedAssignmentRow
                  key={a.id}
                  fromName={a.therapistName}
                  toName={a.childName}
                  detail={a.therapyType}
                  startedOn={a.startedOn}
                  endedOn={a.endedOn}
                  endedReason={a.endedReason}
                  assignmentId={a.id}
                  onRenew={renewTherapistChildAssignment}
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <h2 className="label-micro text-rust-dark">Oversight</h2>
          <h3 className="mt-1 font-heading text-lg text-charcoal">Supervisor access requests</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Therapists who&apos;ve asked to oversee others. Approving grants supervisor access without
            affecting their own caseload or schedule.
          </p>

          <div className="mt-5 flex flex-col divide-y divide-border">
            {pendingSupervisorRequests.length === 0 ? (
              <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              pendingSupervisorRequests.map((r) => <SupervisorRequestRow key={r.id} request={r} />)
            )}
          </div>
        </section>

        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <h2 className="label-micro text-rust-dark">Oversight</h2>
          <h3 className="mt-1 font-heading text-lg text-charcoal">Supervisor &amp; therapist assignments</h3>

          <div className="mt-5">
            <AssignPicker
              leftLabel="Supervisor"
              leftOptions={supervisors}
              rightLabel="Therapist"
              rightOptions={therapists}
              submitLabel="Assign"
              onSubmit={assignSupervisorToTherapist}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {supervisorAssignments.length === 0 ? (
              <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">
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
