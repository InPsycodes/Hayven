"use client";

import { useState } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { SplitAuthPanel } from "@/components/shared/split-auth-panel";

export default function SignupPage() {
  const [role, setRole] = useState<"parent" | "therapist">("parent");

  return (
    <SplitAuthPanel
      progressLabel={role === "therapist" ? "01 / 03" : undefined}
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
    >
      <SignupForm role={role} onRoleChange={setRole} />
    </SplitAuthPanel>
  );
}
