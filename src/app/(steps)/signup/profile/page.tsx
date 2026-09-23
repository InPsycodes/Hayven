import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function SignupProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    redirect("/login?next=/signup/profile");
  }

  // This step edits the therapist_profiles row that step 2 (credentials)
  // creates -- reachable directly by URL with step 2 skipped, which
  // previously meant submitting here hit a missing row and surfaced a raw
  // Postgrest error. Redirect to the step that actually creates it instead
  // of letting the user fill out a form that can never save.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!profile) {
    redirect("/signup/credentials");
  }

  return (
    <div>
      <StepHeader
        title="Set up your profile"
        subtitle="Step 3 of 3: This is what parents will see."
        step={3}
        totalSteps={3}
      />
      <ProfileSetupForm />
    </div>
  );
}
