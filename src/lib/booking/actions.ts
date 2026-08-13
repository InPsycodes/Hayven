"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { createNotification } from "@/lib/notifications/create";
import { formatDateTime, formatNaira } from "@/data/format";

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

  // Caps how many slots a single parent account can hold unpaid at once --
  // without this, a script could cycle through holding and re-holding every
  // open slot on a therapist's calendar (each hold blocks it for 15 minutes,
  // never actually paying), keeping it permanently unbookable by real
  // parents. Scoped to active (not-yet-expired) holds so it doesn't punish
  // someone for holds that are stale but haven't been cleaned up yet.
  const MAX_CONCURRENT_HOLDS = 3;
  const { count: activeHoldCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", session.userId)
    .eq("status", "pending_payment")
    .gt("expires_at", new Date().toISOString());
  if ((activeHoldCount ?? 0) >= MAX_CONCURRENT_HOLDS) {
    return {
      ok: false,
      error: "You have too many sessions waiting on payment right now. Complete or let one expire before holding another.",
    };
  }

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
    .select(
      "id, parent_id, therapist_id, session_type, children(first_name), availability_slots(start_time), therapist_profiles(user_id, users(full_name))"
    )
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

  const child = booking.children as unknown as { first_name: string } | null;
  const slot = booking.availability_slots as unknown as { start_time: string } | null;
  const therapistProfile = booking.therapist_profiles as unknown as {
    user_id: string;
    users: { full_name: string } | null;
  } | null;

  await admin.from("payments").insert({
    booking_id: bookingId,
    payer_id: booking.parent_id,
    payee_id: therapistProfile?.user_id ?? null,
    amount: Math.round(amountKobo / 100),
    type: "session_commission",
    gateway_reference: gatewayReference,
    status: "successful",
  });

  const therapistName = therapistProfile?.users?.full_name ?? "your therapist";
  const sessionLabel = slot ? formatDateTime(slot.start_time) : "your upcoming session";

  if (meetingLink) {
    await createNotification({
      userId: booking.parent_id,
      type: "meeting_link_ready",
      title: "Meeting link ready",
      body: `Your virtual session with ${therapistName} on ${sessionLabel} is confirmed. Join from your sessions page when it's time.`,
    });
  } else {
    await createNotification({
      userId: booking.parent_id,
      type: "booking_confirmed",
      title: "Booking confirmed",
      body: `Your session with ${therapistName} on ${sessionLabel} is confirmed.`,
    });
  }

  if (therapistProfile?.user_id) {
    await createNotification({
      userId: therapistProfile.user_id,
      type: "payment_receipt",
      title: "Payment received",
      body: `You received ${formatNaira(Math.round(amountKobo / 100))} for your session with ${child?.first_name ?? "a client"}.`,
    });
  }

  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true };
}

/**
 * Cancels a parent's own booking and frees the slot. Does NOT process any
 * refund -- there is no Paystack refund integration in this codebase yet, so
 * for an already-paid (confirmed) booking this only updates records; the UI
 * is explicit with the parent that a refund is handled by the team
 * separately, not automatic.
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<ActionResult<{ wasPaid: boolean }>> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to cancel a session." };
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, parent_id, status, availability_slot_id, availability_slots(start_time)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.parent_id !== session.userId) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "pending_payment" && booking.status !== "confirmed") {
    return { ok: false, error: "This session can't be cancelled." };
  }

  const slot = booking.availability_slots as unknown as { start_time: string } | null;
  if (slot && new Date(slot.start_time).getTime() < Date.now()) {
    return { ok: false, error: "This session has already passed." };
  }

  const wasPaid = booking.status === "confirmed";

  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason && reason.trim() ? reason.trim() : null,
    })
    .eq("id", bookingId)
    .eq("status", booking.status)
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return { ok: false, error: "This session can't be cancelled." };

  await admin.from("availability_slots").update({ is_booked: false }).eq("id", booking.availability_slot_id);

  await logAuditEvent({
    actor: session,
    action: "booking.cancel",
    entityType: "booking",
    entityId: bookingId,
    metadata: { wasPaid },
  });

  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true, wasPaid };
}

/**
 * Cancels a booking from the therapist's side (they can't make it, etc.) and
 * frees the slot. Same no-auto-refund caveat as cancelBooking -- an
 * already-paid (confirmed) booking just gets flagged for the admin refund
 * queue, nothing moves automatically.
 */
export async function cancelBookingAsTherapist(
  bookingId: string,
  reason?: string
): Promise<ActionResult<{ wasPaid: boolean }>> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "You must be signed in as a therapist to cancel a session." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) {
    return { ok: false, error: "Couldn't find your therapist profile." };
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, therapist_id, status, availability_slot_id, availability_slots(start_time)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.therapist_id !== therapist.id) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "pending_payment" && booking.status !== "confirmed") {
    return { ok: false, error: "This session can't be cancelled." };
  }

  const slot = booking.availability_slots as unknown as { start_time: string } | null;
  if (slot && new Date(slot.start_time).getTime() < Date.now()) {
    return { ok: false, error: "This session has already passed." };
  }

  const wasPaid = booking.status === "confirmed";

  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason && reason.trim() ? reason.trim() : null,
    })
    .eq("id", bookingId)
    .eq("status", booking.status)
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return { ok: false, error: "This session can't be cancelled." };

  await admin.from("availability_slots").update({ is_booked: false }).eq("id", booking.availability_slot_id);

  await logAuditEvent({
    actor: session,
    action: "booking.cancel",
    entityType: "booking",
    entityId: bookingId,
    metadata: { wasPaid },
  });

  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true, wasPaid };
}
