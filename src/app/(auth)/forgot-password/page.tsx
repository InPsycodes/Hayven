import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <SplitAuthPanel
      eyebrow="Account recovery"
      tagline="Let's get you back in."
      subtext="We'll email you a link to set a new password. It's the fastest way back to your child's care."
    >
      <ForgotPasswordForm linkExpired={error === "expired"} />
    </SplitAuthPanel>
  );
}
