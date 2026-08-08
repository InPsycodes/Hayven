import { notFound, redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { SessionEntryForm } from "@/components/therapy-session/session-entry-form";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getAssignedChildById, getChildProgramme } from "@/lib/therapy-sessions/queries";

export default async function NewTherapySessionPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) notFound();

  const { childId } = await params;
  const child = await getAssignedChildById(childId, therapist.id);
  if (!child) notFound();

  const programme = await getChildProgramme(childId);

  return (
    <div>
      <StepHeader
        title={`Log a session: ${child.firstName}`}
        subtitle="Behaviours, skills, and goal progress feed the generated report."
        step={1}
        totalSteps={1}
        closeHref="/therapist/caseload"
      />
      <SessionEntryForm childId={child.id} childName={child.firstName} programme={programme} />
    </div>
  );
}
