import { redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { getSession } from "@/lib/auth/session";
import { getRealSpecialties } from "@/lib/therapist/queries";

export default async function SignupCredentialsPage() {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    redirect("/login?next=/signup/credentials");
  }

  const specialties = await getRealSpecialties();

  return (
    <div>
      <StepHeader
        eyebrow="Hayven for therapists"
        title="Apply to join Hayven"
        subtitle="Step 2 of 3 -- Credentials & verification"
        step={2}
        totalSteps={3}
      />
      <CredentialsForm specialties={specialties} />
    </div>
  );
}
