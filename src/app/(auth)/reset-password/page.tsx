import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // /auth/confirm sets the recovery session cookie before redirecting here.
  // No session -> the link was bad, expired, or opened directly.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");

  return (
    <SplitAuthPanel eyebrow="Account recovery" tagline="Almost done. Set a new password.">
      <ResetPasswordForm />
    </SplitAuthPanel>
  );
}
