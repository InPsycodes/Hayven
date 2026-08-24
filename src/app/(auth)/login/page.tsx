import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <SplitAuthPanel tagline="Welcome back. Your child's care, all in one place.">
      <LoginForm />
    </SplitAuthPanel>
  );
}
