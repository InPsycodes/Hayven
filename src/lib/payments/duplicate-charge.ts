import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * True when this payment is a second (or later) session charge on its
 * booking -- the "duplicate charge on an already-confirmed booking" that
 * finalizeBookingPayment records (BOOK-01). The booking's own charge is its
 * earliest session_commission row; every later one is owed back in full
 * and has nothing to do with the booking's own cancellation refund or the
 * therapist's earnings.
 *
 * Counts earlier rows in any status, not just "successful": once the
 * original charge has been refunded, a later duplicate is still a
 * duplicate.
 */
export async function isDuplicateCharge(
  admin: Admin,
  payment: { booking_id: string | null; created_at: string }
): Promise<boolean> {
  if (!payment.booking_id) return false;
  const { count } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", payment.booking_id)
    .eq("type", "session_commission")
    .lt("created_at", payment.created_at);
  return (count ?? 0) > 0;
}
