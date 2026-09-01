import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <SplitAuthPanel
      eyebrow="Welcome back"
      tagline="Your child's care, all in one place."
      points={[
        "Your next session, reports, and messages in one view.",
        "Book verified therapists and pay securely.",
        "Follow progress between sessions.",
      ]}
    >
      <LoginForm justReset={reset === "1"} />
    </SplitAuthPanel>
  );
}
