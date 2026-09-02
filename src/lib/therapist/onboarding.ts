import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface OnboardingStatus {
  verified: boolean;
  verificationPending: boolean;
  hasAvailability: boolean;
  hasBankAccount: boolean;
  /** All gates cleared -> the therapist is live in search and bookable. */
  complete: boolean;
}

/**
 * The three things a verified therapist must do before families can book
 * them: pass verification, publish availability, and add a payout bank
 * account. The public discovery view enforces the same gates
 * (verification + bank in the view; availability via 0076) -- this powers
 * the therapist-facing checklist.
 */
export async function getOnboardingStatus(therapistProfileId: string): Promise<OnboardingStatus> {
  const supabase = await createClient();
  const [{ data: profile }, { count: slotCount }] = await Promise.all([
    supabase
      .from("therapist_profiles")
      .select("verification_status, bank_account_number")
      .eq("id", therapistProfileId)
      .maybeSingle(),
    supabase
      .from("availability_slots")
      .select("id", { count: "exact", head: true })
      .eq("therapist_id", therapistProfileId),
  ]);

  const verified = profile?.verification_status === "verified";
  const verificationPending =
    profile?.verification_status === "pending" || profile?.verification_status === "flagged";
  const hasAvailability = (slotCount ?? 0) > 0;
  const hasBankAccount = !!(profile as { bank_account_number?: string | null } | null)?.bank_account_number;

  return {
    verified,
    verificationPending,
    hasAvailability,
    hasBankAccount,
    complete: verified && hasAvailability && hasBankAccount,
  };
}
