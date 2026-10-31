"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { getRealTherapistProfileByUserId, getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { createNotification } from "@/lib/notifications/create";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { bookingWindow, MIN_BOOKING_NOTICE_MS } from "@/lib/booking/window";
import { applyRefundPolicy } from "@/lib/booking/refund-apply";
import { refundNotificationBody } from "@/lib/booking/refund-notification";
import {
  recordRetainedEarning,
  recordNoShowEarning,
  recordSessionEarnings,
  releaseBookingEarnings,
} from "@/lib/payouts/earnings";
import { formatDateTime } from "@/data/format";

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

  // Attempt-frequency guard, separate from the concurrent-hold cap below --
  // that one limits how many unpaid holds can exist at once, this limits how
  // fast new hold attempts can come in (a script retrying rapidly, not just
  // one that's accumulated a few legitimate holds).
  const rateLimitOk = await checkRateLimit(`booking_hold:${session.userId}`, 10, 10 * 60);
  if (!rateLimitOk) {
    return { ok: false, error: "Too many booking attempts. Please wait a few minutes and try again." };
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
  //
  // BOOK-08, pre-launch audit (P2): this count-then-insert isn't atomic --
  // a burst of near-simultaneous calls from the same parent could each read
  // a count under the cap and all proceed, briefly exceeding it. Reviewed
  // and left as-is rather than forcing an incomplete fix: making this
  // genuinely atomic would mean moving the count check AND the eventual
  // booking insert (well below, after the slot hold and price snapshot)
  // into one Postgres transaction holding an advisory lock the whole way
  // through -- a real database-function rewrite, not a small patch. Not
  // worth it here: the rate limiter above (10 hold attempts per 10 min)
  // already bounds how large a burst can even be, and this cap being off
  // by a couple during a deliberate burst cannot cause double-booking --
  // the actual slot claim just below is its own, genuinely atomic
  // conditional UPDATE, unaffected by this.
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
    .select("id, is_booked, therapist_id, start_time")
    .eq("id", input.slotId)
    .maybeSingle();
  if (!slot || slot.therapist_id !== input.therapistId) {
    return { ok: false, error: "That slot is no longer available." };
  }
  if (new Date(slot.start_time).getTime() < Date.now() + MIN_BOOKING_NOTICE_MS) {
    return { ok: false, error: "That time is too soon to book. Please pick a slot at least 2 hours out." };
  }

  // E12: defense in depth alongside therapist_public_profiles' own
  // u.status = 'active' filter (migration 0092) -- discovery shouldn't
  // surface a suspended therapist's slots at all, but a stale client-side
  // listing or a direct call with a known slot id shouldn't be able to
  // create a new hold against one either.
  const { data: therapistAccount } = await admin
    .from("therapist_profiles")
    .select("users(status)")
    .eq("id", input.therapistId)
    .maybeSingle();
  const therapistStatus = (therapistAccount?.users as unknown as { status: string } | null)?.status;
  if (therapistStatus !== "active") {
    return { ok: false, error: "That therapist isn't currently accepting bookings." };
  }

  // Same defense in depth for the insurance gate (0106): a therapist whose
  // cover has ended drops out of discovery, and can't take a new hold via a
  // stale listing either.
  const { count: currentInsuranceCount } = await admin
    .from("credentials")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", input.therapistId)
    .eq("document_type", "insurance")
    .gt("expires_on", new Date().toISOString().slice(0, 10));
  if ((currentInsuranceCount ?? 0) === 0) {
    return { ok: false, error: "That therapist isn't currently accepting bookings." };
  }

  const { data: heldSlot, error: holdError } = await admin
    .from("availability_slots")
    .update({ is_booked: true })
    .eq("id", input.slotId)
    .eq("is_booked", false)
    .select("id")
    .maybeSingle();
  // A request error is not a lost race: telling the parent someone else took
  // the slot sends them hunting for another time when a retry would do. The
  // slot is not released here -- the update may have landed before the
  // response was lost, and if it didn't, the slot may be someone else's hold.
  if (holdError) {
    console.error("createPendingBooking: slot hold failed", holdError.message);
    return { ok: false, error: "We couldn't reserve that time just now. Please try again." };
  }
  if (!heldSlot) {
    return { ok: false, error: "This slot was just booked by someone else. Please pick another time." };
  }

  const { data: therapistProfile } = await admin
    .from("therapist_profiles")
    .select("location, price_per_session")
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

  // Snapshot the price now, as a separate best-effort update -- initiateFlutterwavePayment
  // charges this, not a fresh read of therapist_profiles.price_per_session,
  // so a price change during the 15-minute hold window can't silently
  // change what the parent pays (L-10, production audit 2026-09-03). Split
  // out from the insert above, and its error ignored, so a pre-0080
  // database (no price_naira column yet) still creates the booking --
  // initiateFlutterwavePayment already falls back to the live price when this
  // is null, same pattern as recordSessionEarnings' pre-0073 fallback.
  if (therapistProfile?.price_per_session != null) {
    await admin.from("bookings").update({ price_naira: therapistProfile.price_per_session }).eq("id", booking.id);
  }

  return { ok: true, bookingId: booking.id };
}

// BOOK-02, pre-launch audit (P1): finalizeBookingPayment and
// applyRefundPolicy used to live here -- moved to
// src/lib/booking/finalize-payment.ts and src/lib/booking/refund-apply.ts
// (plain server-only modules, not "use server") since finalizeBookingPayment
// confirms real money and was never meant to be reachable as a Server
// Action from a client at all. See finalize-payment.ts's own comment for
// the full reasoning. applyRefundPolicy is still used directly by several
// functions below (cancelBooking, cancelBookingsForDepartedTherapist,
// cancelBookingAsTherapist), now via import.

/**
 * Cancels a parent's own booking and frees the slot. Records the policy
 * refund amount; the money is still moved by an admin for now.
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<ActionResult<{ wasPaid: boolean; refundNaira: number }>> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to cancel a session." };
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, parent_id, status, availability_slot_id, children(first_name), availability_slots(start_time)")
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

  const outcome = await applyRefundPolicy(admin, bookingId, "parent", slot?.start_time ?? null);

  if (outcome) {
    // Late cancel: the therapist held the slot -> they earn their share of
    // what was retained (excluding the non-earnable payment processing fee).
    if (outcome.tier === "partial") {
      await recordRetainedEarning(admin, bookingId, outcome.withheldNaira - outcome.feeNaira);
    }
    const child = booking.children as unknown as { first_name: string } | null;
    const when = slot ? formatDateTime(slot.start_time) : "your session";
    await createNotification({
      userId: session.userId,
      type: "booking_confirmed",
      title: "Session cancelled",
      body: refundNotificationBody(child?.first_name ?? "Your child", when, outcome, false),
      url: "/parent/sessions",
    });
  }

  await logAuditEvent({
    actor: session,
    action: "booking.cancel",
    entityType: "booking",
    entityId: bookingId,
    metadata: { wasPaid, refundNaira: outcome?.refundNaira ?? null },
  });

  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true, wasPaid, refundNaira: outcome?.refundNaira ?? 0 };
}

/**
 * Therapist sets, updates, or clears the video link for a confirmed virtual
 * booking. Deliberately vendor-agnostic -- the therapist pastes whatever room
 * URL they already use (Google Meet, a Zoom personal room, Whereby, ...).
 * Same service-role + explicit-ownership-check pattern as every other booking
 * write; there is no therapist RLS write policy on `bookings` by design (0030).
 */
export async function setMeetingLink(
  bookingId: string,
  rawLink: string
): Promise<ActionResult<{ meetingLink: string | null }>> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "You must be signed in as a therapist." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Couldn't find your therapist profile." };

  const link = rawLink.trim();
  if (link) {
    let parsed: URL;
    try {
      parsed = new URL(link);
    } catch {
      return { ok: false, error: "That doesn't look like a link. Paste the full URL, starting with https://" };
    }
    if (parsed.protocol !== "https:") {
      return { ok: false, error: "The meeting link must start with https://" };
    }
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, therapist_id, parent_id, status, session_type, meeting_link, children(first_name), availability_slots(start_time)"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.therapist_id !== therapist.id) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.session_type !== "virtual") {
    return { ok: false, error: "This is an in-person session, so it has no video link." };
  }
  if (booking.status !== "confirmed") {
    return { ok: false, error: "You can add a video link once the session is confirmed." };
  }

  const newLink = link || null;
  const { error: updateError } = await admin
    .from("bookings")
    .update({ meeting_link: newLink })
    .eq("id", bookingId);
  if (updateError) return { ok: false, error: updateError.message };

  await logAuditEvent({
    actor: session,
    action: "booking.set_meeting_link",
    entityType: "booking",
    entityId: bookingId,
  });

  // Notify the parent only when a usable link actually appears -- not when
  // it's cleared, and not on a no-op re-save of the same URL.
  if (newLink && newLink !== booking.meeting_link) {
    const slot = booking.availability_slots as unknown as { start_time: string } | null;
    const child = booking.children as unknown as { first_name: string } | null;
    const when = slot ? formatDateTime(slot.start_time) : "your upcoming session";
    await createNotification({
      userId: booking.parent_id,
      type: "meeting_link_ready",
      title: "Video link ready",
      body: `The video link for ${child?.first_name ?? "your child"}'s session on ${when} is ready. Join from your sessions page when it's time.`,
      url: "/parent/sessions",
    });
  }

  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true, meetingLink: newLink };
}

// A parent may move a confirmed booking to another of the same therapist's
// open slots, up to 24 h before the current start time (the window the
// confirmation screen promises). No payment change -- same therapist, same
// price -- so this never touches the payments row.
const RESCHEDULE_MIN_NOTICE_MS = 24 * 60 * 60 * 1000;

export interface RescheduleOption {
  slotId: string;
  startTime: string;
  endTime: string;
}

export async function getRescheduleOptions(
  bookingId: string
): Promise<ActionResult<{ currentStart: string; sessionType: string; options: RescheduleOption[] }>> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent." };
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, parent_id, therapist_id, status, session_type, availability_slot_id, availability_slots(start_time)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.parent_id !== session.userId) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "confirmed") {
    return { ok: false, error: "Only a confirmed session can be rescheduled." };
  }

  const currentSlot = booking.availability_slots as unknown as { start_time: string } | null;
  const currentStart = currentSlot?.start_time ?? "";
  if (currentStart && new Date(currentStart).getTime() - Date.now() < RESCHEDULE_MIN_NOTICE_MS) {
    return {
      ok: false,
      error: "Sessions can only be rescheduled more than 24 hours in advance. Message your therapist to move it.",
    };
  }

  const window = bookingWindow();
  const slots = await getRealAvailabilityForTherapist(booking.therapist_id, window);
  const options = slots
    .filter(
      (s) =>
        !s.isBooked &&
        s.sessionType === booking.session_type &&
        s.id !== booking.availability_slot_id &&
        new Date(s.startTime).getTime() > Date.now()
    )
    .map((s) => ({ slotId: s.id, startTime: s.startTime, endTime: s.endTime }));

  return { ok: true, currentStart, sessionType: booking.session_type, options };
}

export async function rescheduleBooking(
  bookingId: string,
  newSlotId: string
): Promise<ActionResult<{ newStart: string }>> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent." };
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, parent_id, therapist_id, status, session_type, availability_slot_id, children(first_name), availability_slots(start_time), therapist_profiles(user_id, users(full_name))"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.parent_id !== session.userId) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "confirmed") {
    return { ok: false, error: "Only a confirmed session can be rescheduled." };
  }
  if (newSlotId === booking.availability_slot_id) {
    return { ok: false, error: "That's the current time. Pick a different slot." };
  }

  const oldSlot = booking.availability_slots as unknown as { start_time: string } | null;
  const oldSlotId = booking.availability_slot_id;
  if (oldSlot && new Date(oldSlot.start_time).getTime() - Date.now() < RESCHEDULE_MIN_NOTICE_MS) {
    return { ok: false, error: "Sessions can only be rescheduled more than 24 hours in advance." };
  }

  const { data: newSlot } = await admin
    .from("availability_slots")
    .select("id, therapist_id, session_type, is_booked, start_time")
    .eq("id", newSlotId)
    .maybeSingle();
  if (!newSlot || newSlot.therapist_id !== booking.therapist_id || newSlot.session_type !== booking.session_type) {
    return { ok: false, error: "That slot isn't available for this session." };
  }
  if (new Date(newSlot.start_time).getTime() < Date.now() + MIN_BOOKING_NOTICE_MS) {
    return { ok: false, error: "That time is too soon to move into. Please pick a slot at least 2 hours out." };
  }

  // Hold the new slot atomically before touching the booking.
  const { data: held } = await admin
    .from("availability_slots")
    .update({ is_booked: true })
    .eq("id", newSlotId)
    .eq("is_booked", false)
    .select("id")
    .maybeSingle();
  if (!held) {
    return { ok: false, error: "That slot was just taken. Please pick another time." };
  }

  const { data: moved, error: moveError } = await admin
    .from("bookings")
    // meeting_link was for the old time -- clear it so the therapist re-adds one.
    .update({ availability_slot_id: newSlotId, meeting_link: null })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (moveError || !moved) {
    await admin.from("availability_slots").update({ is_booked: false }).eq("id", newSlotId);
    return { ok: false, error: moveError?.message ?? "Couldn't move the session. Please try again." };
  }

  await admin.from("availability_slots").update({ is_booked: false }).eq("id", oldSlotId);

  await logAuditEvent({
    actor: session,
    action: "booking.reschedule",
    entityType: "booking",
    entityId: bookingId,
    metadata: { from: oldSlot?.start_time ?? null, to: newSlot.start_time },
  });

  const child = booking.children as unknown as { first_name: string } | null;
  const therapistProfile = booking.therapist_profiles as unknown as {
    user_id: string;
    users: { full_name: string } | null;
  } | null;
  const newWhen = formatDateTime(newSlot.start_time);

  await createNotification({
    userId: booking.parent_id,
    type: "booking_confirmed",
    title: "Session rescheduled",
    body: `${child?.first_name ?? "Your child"}'s session is now ${newWhen}.`,
    url: "/parent/sessions",
  });
  if (therapistProfile?.user_id) {
    await createNotification({
      userId: therapistProfile.user_id,
      type: "booking_confirmed",
      title: "Session rescheduled",
      body: `${child?.first_name ?? "A client"}'s session was moved to ${newWhen}.`,
      url: "/therapist/schedule",
    });
  }

  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  revalidatePath("/therapist/caseload");
  return { ok: true, newStart: newSlot.start_time };
}

/**
 * Therapist marks a past session as a no-show (the family didn't attend).
 * Distinct from "completed" so a pattern is visible. No automatic refund or
 * penalty -- the consequence policy is a separate decision. Reversible via
 * undoNoShow in case of a misclick.
 */
export async function markNoShow(
  bookingId: string,
  note?: string
): Promise<ActionResult<object>> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "You must be signed in as a therapist." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Couldn't find your therapist profile." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, therapist_id, parent_id, status, children(first_name), availability_slots(start_time, end_time)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.therapist_id !== therapist.id) {
    return { ok: false, error: "Booking not found." };
  }
  // Only "confirmed" -- a session already "completed" was, by definition,
  // attended, and recordSessionEarnings has already credited the therapist
  // for it. Allowing "completed" -> "no_show" let a therapist retroactively
  // zero the parent's refund *and* collect a second, non-deduplicated
  // earning on the same booking (M-5a, production audit 2026-09-03). A
  // genuine "we said completed but nobody actually came" correction should
  // go through support, which can reverse the session earning first.
  if (booking.status !== "confirmed") {
    return { ok: false, error: "Only a session that's still marked confirmed can be reported as a no-show. If it's already marked completed, contact Hayven support." };
  }

  const slot = booking.availability_slots as unknown as { start_time: string; end_time: string } | null;
  if (!slot || new Date(slot.end_time).getTime() > Date.now()) {
    return { ok: false, error: "You can only mark a no-show after the session's scheduled time." };
  }

  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({
      status: "no_show",
      no_show_at: new Date().toISOString(),
      no_show_note: note && note.trim() ? note.trim() : null,
    })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return { ok: false, error: "This session can't be marked as a no-show." };

  // Policy: a no-show forfeits the session, nothing owed. Separate update so
  // a pre-0071 DB (no refund_amount column) doesn't fail the status change.
  await admin.from("bookings").update({ refund_amount: 0 }).eq("id", bookingId);
  // The therapist earns their share of the forfeited charge.
  await recordNoShowEarning(admin, bookingId);

  await logAuditEvent({
    actor: session,
    action: "booking.no_show",
    entityType: "booking",
    entityId: bookingId,
  });

  // Anomaly signal: no single-request guard on volume (a verified therapist
  // could mark every past session no_show, zeroing every parent's refund),
  // so alert when one therapist's rate looks abnormal instead (M-5b,
  // production audit 2026-09-03).
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentNoShows } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", therapist.id)
    .eq("status", "no_show")
    .gte("no_show_at", thirtyDaysAgo);
  if ((recentNoShows ?? 0) >= 5) {
    Sentry.captureMessage("Therapist no-show rate looks abnormal", {
      level: "warning",
      tags: { anomaly: "no_show_rate" },
      extra: { therapistId: therapist.id, recentNoShows },
    });
  }

  const child = booking.children as unknown as { first_name: string } | null;
  const when = slot ? formatDateTime(slot.start_time) : "a recent session";
  await createNotification({
    userId: booking.parent_id,
    type: "booking_confirmed",
    title: "Session marked as not attended",
    body: `${child?.first_name ?? "Your child"}'s session on ${when} was marked as not attended. If that's not right, message your therapist or contact Hayven support.`,
    url: "/parent/sessions",
  });

  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true };
}

export async function undoNoShow(bookingId: string): Promise<ActionResult<object>> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "You must be signed in as a therapist." };
  }
  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Couldn't find your therapist profile." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, therapist_id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.therapist_id !== therapist.id) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "no_show") {
    return { ok: false, error: "This session isn't marked as a no-show." };
  }

  const { error: updateError } = await admin
    .from("bookings")
    .update({ status: "completed", no_show_at: null, no_show_note: null })
    .eq("id", bookingId)
    .eq("status", "no_show");
  if (updateError) return { ok: false, error: updateError.message };

  // The session counts as having happened after all: drop the no-show
  // retained earning, add the normal session earning.
  await releaseBookingEarnings(admin, bookingId, true);
  await recordSessionEarnings(admin, [bookingId]);

  await logAuditEvent({
    actor: session,
    action: "booking.no_show_undo",
    entityType: "booking",
    entityId: bookingId,
  });

  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true };
}

/**
 * Cancels a booking from the therapist's side (they can't make it, etc.),
 * frees the slot, and records a full policy refund for the parent (a family
 * shouldn't lose money to a therapist's cancellation). The money is still
 * moved by an admin for now.
 */
export async function cancelBookingAsTherapist(
  bookingId: string,
  reason?: string
): Promise<ActionResult<{ wasPaid: boolean; refundNaira: number }>> {
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
    .select("id, therapist_id, parent_id, status, availability_slot_id, children(first_name), availability_slots(start_time)")
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

  const outcome = await applyRefundPolicy(admin, bookingId, "therapist", slot?.start_time ?? null);

  if (outcome) {
    const child = booking.children as unknown as { first_name: string } | null;
    const when = slot ? formatDateTime(slot.start_time) : "your session";
    await createNotification({
      userId: booking.parent_id,
      type: "booking_confirmed",
      title: "Session cancelled by the therapist",
      body: refundNotificationBody(child?.first_name ?? "Your child", when, outcome, true),
      url: "/parent/sessions",
    });
  }

  await logAuditEvent({
    actor: session,
    action: "booking.cancel",
    entityType: "booking",
    entityId: bookingId,
    metadata: { wasPaid, byTherapist: true, refundNaira: outcome?.refundNaira ?? null },
  });

  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/therapist/schedule");
  return { ok: true, wasPaid, refundNaira: outcome?.refundNaira ?? 0 };
}
