import { notFound, redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { IntakeFormView } from "@/components/therapist/intake-form-view";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getAssignedChildById } from "@/lib/therapy-sessions/queries";
import { getIntakeFormForChild } from "@/lib/intake/queries";

export default async function TherapistIntakeFormPage({
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

  const form = await getIntakeFormForChild(childId);

  return (
    <div>
      <DashboardHeader session={session} greeting="Intake form" subtext={`For ${child.firstName}`} />
      <div className="px-5 py-6 md:px-10 md:py-8">
        <Card lift className="max-w-2xl p-5 md:p-6">
          <IntakeFormView childName={child.firstName} form={form} />
        </Card>
      </div>
    </div>
  );
}
