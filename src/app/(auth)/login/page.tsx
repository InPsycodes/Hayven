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
    <SplitAuthPanel tagline="Welcome back. Your child's care, all in one place.">
      <LoginForm justReset={reset === "1"} />
    </SplitAuthPanel>
  );
}
