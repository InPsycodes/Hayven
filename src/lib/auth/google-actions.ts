"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { captureServer } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export type FinishGoogleSignupResult = { ok: true } | { ok: false; error: string };

/**
 * Second step of Google sign-up: records the phone number and the
 * Privacy Policy / Terms consent that the password form collects up front.
 * Only ever acts on the caller's own parent account, and only while consent
 * hasn't been recorded -- it can't be replayed to overwrite an existing
 * account's details.
 */
export async function finishGoogleSignup(input: {
  fullName: string;
  phone: string;
  agreedToTerms: boolean;
}): Promise<FinishGoogleSignupResult> {
  const session = await getSession();
  if (!session || session.role !== "parent") return { ok: false, error: "Please sign in again." };

  if (!input.agreedToTerms) {
    return { ok: false, error: "Please agree to the Privacy Policy and Terms of Service to continue." };
  }
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  if (!fullName) return { ok: false, error: "Enter your name." };
  if (phone.replace(/[^\d]/g, "").length < 7) {
    return { ok: false, error: "Enter a phone number we can reach you on." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .update({ full_name: fullName, phone, terms_accepted_at: new Date().toISOString() })
    .eq("id", session.userId)
    .is("terms_accepted_at", null)
    .select("id");
  if (error) return { ok: false, error: "Couldn't save your details. Please try again." };
  if (!data?.length) return { ok: true };

  await captureServer(session.userId, ANALYTICS_EVENTS.signupCompleted, { role: "parent", method: "google" });
  return { ok: true };
}
