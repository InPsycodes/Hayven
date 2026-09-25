import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { splitEarning, earningSourcesReversedByRefund, EARNING_HOLD_MS } from "@/lib/payouts/commission";
import { paystackFeeNaira } from "@/lib/booking/refund-policy";
import { isDuplicateCharge } from "@/lib/payments/duplicate-charge";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Records a therapist earning for each newly-completed session. Idempotent
 * (unique (booking_id, 'session')). Called wherever a booking transitions
 * confirmed -> completed. Silently no-ops on a pre-0073 database.
 */
export async function recordSessionEarnings(admin: Admin, bookingIds: string[]): Promise<void> {
  if (bookingIds.length === 0) return;

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, therapist_id, payout_hold, availability_slots(end_time), payments(amount, status, type)")
    .in("id", bookingIds);

  const rows = [];
  for (const b of bookings ?? []) {
    const payments = (b.payments ?? []) as { amount: number; status: string; type: string }[];
    const paid = payments.find((p) => p.status === "successful" && p.type === "session_commission");
    if (!paid || paid.amount <= 0) continue;
    const end = (b.availability_slots as unknown as { end_time: string } | null)?.end_time;
    const { gross, commission, net } = splitEarning(paid.amount);
    rows.push({
      therapist_id: b.therapist_id,
      booking_id: b.id,
      source: "session" as const,
      gross_amount: gross,
      commission_amount: commission,
      net_amount: net,
      status: b.payout_hold ? ("held" as const) : ("pending" as const),
      payable_at: new Date((end ? new Date(end).getTime() : Date.now()) + EARNING_HOLD_MS).toISOString(),
    });
  }
  if (rows.length > 0) {
    await admin.from("therapist_earnings").upsert(rows, { onConflict: "booking_id,source", ignoreDuplicates: true });
  }
}

/**
 * Records the therapist's share of money a parent forfeited on a late
 * cancel or no-show. `retainedNaira` is the amount kept BEFORE splitting;
 * the Paystack fee should already be excluded by the caller.
 */
export async function recordRetainedEarning(
  admin: Admin,
  bookingId: string,
  retainedNaira: number
): Promise<void> {
  if (retainedNaira <= 0) return;
  const { data: b } = await admin
    .from("bookings")
    .select("therapist_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;
  const { gross, commission, net } = splitEarning(retainedNaira);
  await admin.from("therapist_earnings").upsert(
    {
      therapist_id: b.therapist_id,
      booking_id: bookingId,
      source: "retained_cancellation" as const,
      gross_amount: gross,
      commission_amount: commission,
      net_amount: net,
      status: "pending" as const,
      payable_at: new Date(Date.now() + EARNING_HOLD_MS).toISOString(),
    },
    { onConflict: "booking_id,source", ignoreDuplicates: true }
  );
}

/** No-show: the parent forfeits the whole charge; the therapist earns their
 *  share of it, minus the (non-refundable, non-earnable) Paystack fee. */
export async function recordNoShowEarning(admin: Admin, bookingId: string): Promise<void> {
  const { data: payments } = await admin
    .from("payments")
    .select("amount, status, type")
    .eq("booking_id", bookingId)
    .eq("status", "successful")
    .eq("type", "session_commission");
  const paid = (payments ?? [])[0]?.amount ?? 0;
  if (paid <= 0) return;
  await recordRetainedEarning(admin, bookingId, paid - paystackFeeNaira(paid));
}

/** Dispute opened -> hold any pending earnings for that booking. */
export async function holdBookingEarnings(admin: Admin, bookingId: string): Promise<void> {
  await admin
    .from("therapist_earnings")
    .update({ status: "held" })
    .eq("booking_id", bookingId)
    .eq("status", "pending");
}

/** Dispute resolved -> release the hold (or reverse the earning if the
 *  parent was refunded, since the retained money went back). */
export async function releaseBookingEarnings(admin: Admin, bookingId: string, refunded: boolean): Promise<void> {
  if (refunded) {
    await admin
      .from("therapist_earnings")
      .update({ status: "reversed" })
      .eq("booking_id", bookingId)
      .in("status", ["held", "pending"]);
  } else {
    await admin
      .from("therapist_earnings")
      .update({ status: "pending" })
      .eq("booking_id", bookingId)
      .eq("status", "held");
  }
}

/**
 * A refund of one payment went (or is going) back to the parent -> reverse
 * the earnings that money paid for, and only those. Used by every refund
 * path outside dispute resolution (the admin refund queue, the manual
 * "mark refunded" action and the refund.processed webhook).
 *
 * This used to be releaseBookingEarnings(..., true), which reverses every
 * pending/held earning on the booking. That was right for a dispute but
 * wrong here: a late-cancel refund also wiped out the therapist's share of
 * the half the policy kept, and refunding a duplicate charge reversed the
 * earning for the real session. See earningSourcesReversedByRefund.
 */
export async function reverseEarningsForRefund(admin: Admin, paymentId: string): Promise<void> {
  const { data: payment } = await admin
    .from("payments")
    .select("booking_id, created_at, bookings(status)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment?.booking_id) return;

  const booking = payment.bookings as unknown as { status: string } | null;
  const sources = earningSourcesReversedByRefund({
    isDuplicateCharge: await isDuplicateCharge(admin, payment),
    bookingStatus: booking?.status ?? null,
  });
  if (sources.length === 0) return;

  await admin
    .from("therapist_earnings")
    .update({ status: "reversed" })
    .eq("booking_id", payment.booking_id)
    .in("source", sources)
    .in("status", ["held", "pending"]);
}
