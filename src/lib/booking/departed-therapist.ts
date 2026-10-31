import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { applyRefundPolicy } from "@/lib/booking/refund-apply";
import { refundNotificationBody } from "@/lib/booking/refund-notification";
import { formatDateTime } from "@/data/format";

// Moved out of booking/actions.ts ("use server"), where every export is a
// publicly callable endpoint; only offboardTherapist calls this. Audit F-01.

/**
 * E12, external PRD review: cancels every future confirmed booking for a
 * therapist being offboarded (src/lib/admin/actions.ts offboardTherapist).
 * Same refund tier a therapist-initiated cancellation gets (full refund,
 * Hayven absorbs the fee) -- this is never the parent's fault. Queues the
 * refund the same way cancelBooking does (bookings.refund_amount, feeding
 * the existing admin refund queue) rather than moving money automatically.
 * Already-past bookings are left alone -- autoCompletePastBookings handles
 * those normally, there's nothing to cancel or refund.
 */
export async function cancelBookingsForDepartedTherapist(
  admin: ReturnType<typeof createAdminClient>,
  therapistProfileId: string
): Promise<{ cancelled: number; holdsReleased: number }> {
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, parent_id, availability_slot_id, children(first_name), availability_slots(start_time)")
    .eq("therapist_id", therapistProfileId)
    .eq("status", "confirmed");

  let cancelled = 0;
  for (const booking of bookings ?? []) {
    const slot = booking.availability_slots as unknown as { start_time: string } | null;
    if (slot && new Date(slot.start_time).getTime() < Date.now()) continue;

    const { data: updated } = await admin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Therapist is no longer on Hayven.",
      })
      .eq("id", booking.id)
      .eq("status", "confirmed")
      .select("id")
      .maybeSingle();
    if (!updated) continue;

    await admin.from("availability_slots").update({ is_booked: false }).eq("id", booking.availability_slot_id);

    const outcome = await applyRefundPolicy(admin, booking.id, "therapist", slot?.start_time ?? null);
    if (outcome) {
      const child = booking.children as unknown as { first_name: string } | null;
      const when = slot ? formatDateTime(slot.start_time) : "your session";
      await createNotification({
        userId: booking.parent_id,
        type: "booking_confirmed",
        title: "Session cancelled",
        body: refundNotificationBody(child?.first_name ?? "Your child", when, outcome, true),
        url: "/parent/sessions",
      });
    }
    cancelled += 1;
  }

  // BOOK-04, pre-launch audit (P1): the cascade above only ever cancelled
  // *confirmed* bookings -- a hold still sitting at pending_payment (up to
  // 15 minutes old, unpaid) was left untouched, so a parent who placed a
  // hold moments before this therapist was offboarded could still complete
  // payment afterward and end up with a confirmed booking against someone
  // no longer on the platform. Nothing was ever charged for these, so
  // there's no refund to compute -- just release the hold and the slot,
  // same shape as releaseExpiredHolds (src/lib/therapist/queries.ts).
  const { data: holds } = await admin
    .from("bookings")
    .select("id, parent_id, availability_slot_id, children(first_name)")
    .eq("therapist_id", therapistProfileId)
    .eq("status", "pending_payment");

  let holdsReleased = 0;
  for (const hold of holds ?? []) {
    const { data: released } = await admin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "therapist_departed",
      })
      .eq("id", hold.id)
      .eq("status", "pending_payment")
      .select("id")
      .maybeSingle();
    if (!released) continue;

    await admin.from("availability_slots").update({ is_booked: false }).eq("id", hold.availability_slot_id);

    const child = hold.children as unknown as { first_name: string } | null;
    await createNotification({
      userId: hold.parent_id,
      type: "booking_confirmed",
      title: "Your held session is no longer available",
      body: `The therapist you were booking for ${child?.first_name ?? "your child"} is no longer on Hayven. You haven't been charged -- find another therapist whenever you're ready.`,
      url: "/search",
    });
    holdsReleased += 1;
  }

  return { cancelled, holdsReleased };
}
