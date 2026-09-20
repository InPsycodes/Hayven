import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

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
 *
 * bank_account_number is select-revoked from `authenticated`/`anon` (0084),
 * so the existence check reads it via the service-role client, re-verifying
 * the caller owns this profile first -- same reasoning as getBankDetails.
 */
export async function getOnboardingStatus(therapistProfileId: string): Promise<OnboardingStatus> {
  const session = await getSession();
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profile }, { count: slotCount }, { data: bankRow }] = await Promise.all([
    supabase
      .from("therapist_profiles")
      .select("verification_status")
      .eq("id", therapistProfileId)
      .maybeSingle(),
    supabase
      .from("availability_slots")
      .select("id", { count: "exact", head: true })
      .eq("therapist_id", therapistProfileId),
    session && session.role === "therapist"
      ? admin
          .from("therapist_profiles")
          .select("user_id, bank_account_number")
          .eq("id", therapistProfileId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const verified = profile?.verification_status === "verified";
  const verificationPending =
    profile?.verification_status === "pending" || profile?.verification_status === "flagged";
  const hasAvailability = (slotCount ?? 0) > 0;
  const hasBankAccount = !!(bankRow?.user_id === session?.userId && bankRow?.bank_account_number);

  return {
    verified,
    verificationPending,
    hasAvailability,
    hasBankAccount,
    complete: verified && hasAvailability && hasBankAccount,
  };
}
