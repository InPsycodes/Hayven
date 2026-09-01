"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";

type SignupRole = "parent" | "therapist";

function SignupPageInner() {
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const [role, setRole] = useState<SignupRole>(requestedRole === "therapist" ? "therapist" : "parent");

  return (
    <SplitAuthPanel
      progressLabel={role === "therapist" ? "01 / 03" : undefined}
      eyebrow={role === "therapist" ? "For therapists" : "For parents"}
      tagline={
        role === "parent"
          ? "Every family deserves a therapist they can trust, and progress they can see."
          : "Your caseload, your notes, your practice, all in one calm place."
      }
      subtext={
        role === "therapist"
          ? "Create an account to start your application. You'll submit credentials on the next step."
          : undefined
      }
      points={
        role === "therapist"
          ? [
              "One place for your schedule, caseload, and session notes.",
              "Get paid per session, with payouts you can track.",
              "Admin-verified profile so families arrive already trusting you.",
            ]
          : [
              "A guided assessment that turns “something feels off” into a clear next step.",
              "Only admin-verified therapists, matched on concern, budget, and session type.",
              "Session reports and progress you can actually follow.",
            ]
      }
      quote={
        role === "parent"
          ? {
              text: "For the first time I felt like I was part of my son's therapy, not just dropping him off.",
              attribution: "A parent on Hayven",
            }
          : undefined
      }
    >
      <SignupForm role={role} onRoleChange={setRole} />
    </SplitAuthPanel>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}
