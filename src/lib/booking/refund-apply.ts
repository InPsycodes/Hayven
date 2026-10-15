import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeRefund, type RefundOutcome } from "@/lib/booking/refund-policy";

/**
 * Applies the cancellation refund policy (src/lib/booking/refund-policy.ts):
 * finds the paid amount, computes what the parent is owed, and records it on
 * the booking (`refund_amount`). The money itself moves when an admin
 * processes it from the refund queue (via Flutterwave) -- this
 * just makes the amount deterministic and visible instead of "the team will
 * work it out". Returns null for an unpaid booking (nothing to refund).
 */
export async function applyRefundPolicy(
  admin: ReturnType<typeof createAdminClient>,
  bookingId: string,
  initiatedBy: "parent" | "therapist",
  slotStartTime: string | null
): Promise<RefundOutcome | null> {
  const { data: payment } = await admin
    .from("payments")
    .select("amount")
    .eq("booking_id", bookingId)
    .eq("status", "successful")
    .eq("type", "session_commission")
    .maybeSingle();
  if (!payment) return null;

  const outcome = computeRefund({
    amountPaidNaira: payment.amount,
    slotStartMs: slotStartTime ? new Date(slotStartTime).getTime() : Date.now(),
    nowMs: Date.now(),
    initiatedBy,
  });
  // Pre-0071 this column doesn't exist yet -- the error is swallowed and the
  // admin queue falls back to the full charged amount, same as before.
  await admin.from("bookings").update({ refund_amount: outcome.refundNaira }).eq("id", bookingId);
  return outcome;
}
