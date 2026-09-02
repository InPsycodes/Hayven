import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { formatNaira } from "@/data/format";

/**
 * Paystack refund webhooks. `refund.processed` confirms the money is back
 * with the parent; `refund.failed` / `refund.pending` we surface but don't
 * finalise.
 */
export async function finalizeRefund(
  event: "refund.processed" | "refund.failed" | "refund.pending",
  transactionReference: string | undefined
): Promise<void> {
  if (!transactionReference) return;
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, payer_id, status, bookings(children(first_name), refund_amount)")
    .eq("gateway_reference", transactionReference)
    .maybeSingle();
  if (!payment || !payment.booking_id) return;

  if (event === "refund.processed") {
    await admin.from("payments").update({ status: "refunded" }).eq("id", payment.id);
    await admin.from("bookings").update({ refund_status: "processed" }).eq("id", payment.booking_id);

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

  if (event === "refund.failed") {
    // Back to "owed" so the admin queue picks it up again.
    await admin.from("bookings").update({ refund_status: null }).eq("id", payment.booking_id);
  }
}
