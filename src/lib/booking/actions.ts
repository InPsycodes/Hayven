"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult<T> = { ok: true } & T | { ok: false; error: string };

/**
 * Creates a pending_payment booking and holds the slot. Uses the service-role
 * client for the slot hold + insert since this necessarily writes to another
 * user's (the therapist's) row -- the authorization checks below (session
 * role, child ownership, slot availability) are what make this safe, not RLS.
 */
export async function createPendingBooking(input: {
  childId: string;
  therapistId: string;
  slotId: string;
  sessionType: "in_person" | "virtual";
}): Promise<ActionResult<{ bookingId: string }>> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to book a session." };
  }

  const supabase = await createClient();
  const { data: child } = await supabase
    .from("children")
    .select("id")
    .eq("id", input.childId)
    .eq("parent_id", session.userId)
    .maybeSingle();
  if (!child) {
    return { ok: false, error: "Couldn't find that child on your account." };
  }

  const admin = createAdminClient();

  const { data: slot } = await admin
    .from("availability_slots")
    .select("id, is_booked, therapist_id")
    .eq("id", input.slotId)
    .maybeSingle();
  if (!slot || slot.therapist_id !== input.therapistId) {
    return { ok: false, error: "That slot is no longer available." };
  }

  const { data: heldSlot, error: holdError } = await admin
    .from("availability_slots")
    .update({ is_booked: true })
    .eq("id", input.slotId)
    .eq("is_booked", false)
    .select("id")
    .maybeSingle();
  if (holdError || !heldSlot) {
    return { ok: false, error: "This slot was just booked by someone else. Please pick another time." };
  }

  const { data: therapistProfile } = await admin
    .from("therapist_profiles")
    .select("location")
    .eq("id", input.therapistId)
    .maybeSingle();

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      parent_id: session.userId,
      child_id: input.childId,
      therapist_id: input.therapistId,
      availability_slot_id: input.slotId,
      status: "pending_payment",
      session_type: input.sessionType,
      location: input.sessionType === "in_person" ? (therapistProfile?.location ?? null) : null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    await admin.from("availability_slots").update({ is_booked: false }).eq("id", input.slotId);
    return { ok: false, error: bookingError?.message ?? "Couldn't create the booking. Please try again." };
  }

  return { ok: true, bookingId: booking.id };
}

/**
 * Marks a booking confirmed and records the payment, once Paystack has
 * confirmed the charge (via webhook signature or a direct /verify call --
 * both happen upstream of this function, which is why it doesn't check a
 * parent session: by the time it's called, Paystack itself is the authority).
 *
 * Idempotent via a conditional update (only transitions pending_payment ->
 * confirmed) so it's safe to call from both the webhook and the redirect
 * callback without double-booking a payments row.
 */
export async function finalizeBookingPayment(
  bookingId: string,
  gatewayReference: string,
  amountKobo: number
): Promise<ActionResult<object>> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, parent_id, therapist_id, session_type")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };

  const meetingLink =
    booking.session_type === "virtual" ? `https://meet.hayven.app/${bookingId}` : null;

  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ status: "confirmed", meeting_link: meetingLink, expires_at: null })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return { ok: true }; // already finalized by a prior call -- idempotent no-op

  const { data: therapistProfile } = await admin
    .from("therapist_profiles")
    .select("user_id")
    .eq("id", booking.therapist_id)
    .maybeSingle();

  await admin.from("payments").insert({
    booking_id: bookingId,
    payer_id: booking.parent_id,
    payee_id: therapistProfile?.user_id ?? null,
    amount: Math.round(amountKobo / 100),
    type: "session_commission",
    gateway_reference: gatewayReference,
    status: "successful",
  });

  revalidatePath("/parent");
  revalidatePath("/therapist/schedule");
  return { ok: true };
}
