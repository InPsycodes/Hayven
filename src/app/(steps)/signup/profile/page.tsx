import { redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { getSession } from "@/lib/auth/session";

export default async function SignupProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    redirect("/login?next=/signup/profile");
  }

  return (
    <div>
      <StepHeader
        title="Set up your profile"
        subtitle="Step 3 of 3 -- This is what parents will see."
        step={3}
        totalSteps={3}
      />
      <ProfileSetupForm />
    </div>
  );
}
