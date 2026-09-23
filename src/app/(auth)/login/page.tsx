import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; next?: string; error?: string }>;
}) {
  const { reset, next: nextParam, error } = await searchParams;
  // Same relative-path-only guard as auth/confirm/route.ts -- a validated
  // `next` can't become an open redirect. Middleware and the step pages
  // (src/proxy.ts) push unauthenticated users here with ?next=<path> so
  // they land back where they were going, e.g. mid-booking, instead of
  // always at their role's dashboard (L-9, production audit 2026-09-03).
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : undefined;

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
      <LoginForm justReset={reset === "1"} next={next} oauthError={error} />
    </SplitAuthPanel>
  );
}
