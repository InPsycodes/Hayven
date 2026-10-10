import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FinishSignupForm } from "@/components/auth/finish-signup-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Finish signing up" };

export default async function FinishSignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  const { next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam) ?? "/parent";

  return (
    <SplitAuthPanel
      eyebrow="For parents"
      tagline="Every family deserves a therapist they can trust, and progress they can see."
    >
      <FinishSignupForm initialName={session.name} next={next} />
    </SplitAuthPanel>
  );
}
