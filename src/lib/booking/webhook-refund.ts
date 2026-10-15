import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { releaseBookingEarnings } from "@/lib/payouts/earnings";
import { formatNaira } from "@/data/format";
import { refundOutcome } from "@/lib/payments/flutterwave-shared";

/**
 * A refund's outcome, from Flutterwave's refund webhook or from checking a
 * refund still processing (reconciliation). `status` is Flutterwave's
 * refund status: "completed..." means the money is back with the parent;
 * a failure puts the refund back in the admin queue; anything else is
 * still in progress.
 */
export async function finalizeRefundByTransaction(
  status: string | undefined,
  transactionId: string | undefined
): Promise<void> {
  if (!transactionId) return;
  const outcome = refundOutcome(status);
  if (outcome === "pending") return;
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, payer_id, status, bookings(children(first_name), refund_amount)")
    .eq("gateway_transaction_id", transactionId)
    .maybeSingle();
  if (!payment || !payment.booking_id) return;

  if (outcome === "processed") {
    if (payment.status === "refunded") return; // already finalised
    await admin.from("payments").update({ status: "refunded" }).eq("id", payment.id);
    await admin.from("bookings").update({ refund_status: "processed" }).eq("id", payment.booking_id);
    // Only the dispute-resolve path used to reverse the therapist's earning
    // on a refund -- a refund from the Refunds queue or this webhook left
    // Hayven paying the therapist in full while also refunding the parent
    // (M-2, production audit 2026-09-03). releaseBookingEarnings only
    // touches held/pending rows, so this is a safe no-op if the earning was
    // already reversed by the admin action below, or never existed.
    await releaseBookingEarnings(admin, payment.booking_id, true);

    const booking = payment.bookings as unknown as {
      children: { first_name: string } | null;
      refund_amount: number | null;
    } | null;
    await createNotification({
      userId: payment.payer_id,
      type: "payment_receipt",
      title: "Refund complete",
      body: `Your refund${
        booking?.refund_amount ? ` of ${formatNaira(booking.refund_amount)}` : ""
      } for ${booking?.children?.first_name ?? "your child"}'s session has been sent back to your card.`,
      url: "/parent/sessions",
    });
    return;
  }

  if (outcome === "failed") {
    // Back to "owed" so the admin queue picks it up again.
    await admin.from("bookings").update({ refund_status: null }).eq("id", payment.booking_id);
  }
}
