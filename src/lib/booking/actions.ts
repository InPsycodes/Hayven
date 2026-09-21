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
import { computeRefund, type RefundOutcome } from "@/lib/booking/refund-policy";
import {
  recordRetainedEarning,
  recordNoShowEarning,
  recordSessionEarnings,
  releaseBookingEarnings,
} from "@/lib/payouts/earnings";
import { captureServer } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
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

  // Snapshot the price now, as a separate best-effort update -- initiatePaystackPayment
  // charges this, not a fresh read of therapist_profiles.price_per_session,
  // so a price change during the 15-minute hold window can't silently
  // change what the parent pays (L-10, production audit 2026-09-03). Split
  // out from the insert above, and its error ignored, so a pre-0080
  // database (no price_naira column yet) still creates the booking --
  // initiatePaystackPayment already falls back to the live price when this
  // is null, same pattern as recordSessionEarnings' pre-0073 fallback.
  if (therapistProfile?.price_per_session != null) {
    await admin.from("bookings").update({ price_naira: therapistProfile.price_per_session }).eq("id", booking.id);
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
      "id, parent_id, therapist_id, child_id, session_type, availability_slot_id, children(first_name), availability_slots(start_time), therapist_profiles(user_id, users(full_name))"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };

  // MEETING_BASE_URL is the origin of whatever video tool the pilot uses
  // (e.g. "https://meet.google.com" with a per-booking path, or a Whereby
  // subdomain). Left unset until one is chosen -- virtual bookings then
  // carry no auto link and the therapist shares one directly with the
  // parent, which the notification copy below reflects.
  const meetingBaseUrl = process.env.MEETING_BASE_URL?.replace(/\/+$/, "");
  const meetingLink =
    booking.session_type === "virtual" && meetingBaseUrl ? `${meetingBaseUrl}/${bookingId}` : null;

  const child = booking.children as unknown as { first_name: string } | null;
  const slot = booking.availability_slots as unknown as { start_time: string } | null;
  const therapistProfile = booking.therapist_profiles as unknown as {
    user_id: string;
    users: { full_name: string } | null;
  } | null;

  // Everything a confirmed booking needs beyond the status flip itself --
  // shared between the normal path below and the reclaimed-slot path in
  // handleMissedConfirmation, so a hold that expired just before payment
  // landed gets the exact same treatment as one that didn't.
  // Arrow-const rather than a nested function declaration -- TS only
  // carries the `booking` non-null narrowing above into a closure for the
  // latter form.
  const applyConfirmedBookingEffects = async () => {
    // The therapist_child_assignments RLS policy (0011) was written to allow
    // a therapist to "self-assign from a booking", and /therapist/caseload
    // has always told therapists this happens automatically -- but nothing
    // ever actually performed the insert, so a confirmed booking never
    // showed up in caseload. This is that missing insert. 23505 = the
    // active-assignment partial unique index already has a row for this
    // pair (a prior admin assignment, or a repeat booking) -- not an error,
    // just already covered.
    const { error: assignmentError } = await admin.from("therapist_child_assignments").insert({
      therapist_id: booking.therapist_id,
      child_id: booking.child_id,
    });
    if (assignmentError && assignmentError.code !== "23505") {
      console.error("Failed to auto-create therapist_child_assignment on booking confirmation", assignmentError);
    }

    // CHECK ALL recheck: this insert used to go unchecked -- every race that
    // could realistically hit it twice for the same (bookingId,
    // gatewayReference) is already caught upstream (the loser of any of
    // finalizeBookingPayment's conditional-update races either short-circuits
    // on current.status === "confirmed" or lands in handleMissedConfirmation's
    // own 23505-guarded insert), so there's no known live path to a failure
    // here. But this function is the one place a booking's status flips to
    // "confirmed" -- if this insert ever did fail silently, the result would
    // be worse than the orphaned-charge bug E2 fixed: a booking marked
    // confirmed with no payments row and nothing to ever notice it.
    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: bookingId,
      payer_id: booking.parent_id,
      payee_id: therapistProfile?.user_id ?? null,
      amount: Math.round(amountKobo / 100),
      type: "session_commission",
      gateway_reference: gatewayReference,
      status: "successful",
    });
    if (paymentError) {
      Sentry.captureMessage("Booking confirmed but its payments row failed to insert", {
        level: "error",
        tags: { anomaly: "confirmed_booking_missing_payment_row" },
        extra: { bookingId, gatewayReference, dbError: paymentError.message },
      });
    }

    const therapistName = therapistProfile?.users?.full_name ?? "your therapist";
    const sessionLabel = slot ? formatDateTime(slot.start_time) : "your upcoming session";

    if (meetingLink) {
      await createNotification({
        userId: booking.parent_id,
        type: "meeting_link_ready",
        title: "Meeting link ready",
        body: `Your virtual session with ${therapistName} on ${sessionLabel} is confirmed. Join from your sessions page when it's time.`,
        url: "/parent/sessions",
      });
    } else if (booking.session_type === "virtual") {
      await createNotification({
        userId: booking.parent_id,
        type: "booking_confirmed",
        title: "Booking confirmed",
        body: `Your virtual session with ${therapistName} on ${sessionLabel} is confirmed. ${therapistName} will share the video link with you before the session.`,
        url: "/parent/sessions",
      });
    } else {
      await createNotification({
        userId: booking.parent_id,
        type: "booking_confirmed",
        title: "Booking confirmed",
        body: `Your session with ${therapistName} on ${sessionLabel} is confirmed.`,
        url: "/parent/sessions",
      });
    }

    if (therapistProfile?.user_id) {
      await createNotification({
        userId: therapistProfile.user_id,
        type: "payment_receipt",
        title: "Payment received",
        body: `You received ${formatNaira(Math.round(amountKobo / 100))} for your session with ${child?.first_name ?? "a client"}.`,
        url: "/therapist/earnings",
      });
    }

    await captureServer(booking.parent_id, ANALYTICS_EVENTS.bookingPaid, {
      amount_naira: Math.round(amountKobo / 100),
      session_type: booking.session_type ?? undefined,
    });

    revalidatePath("/parent");
    revalidatePath("/parent/sessions");
    revalidatePath("/therapist/schedule");
    revalidatePath("/therapist/caseload");
  };

  // E2, external PRD review: this used to treat any miss here ("status is no
  // longer pending_payment") as "already finalized by a prior call" and
  // return ok:true unconditionally. That's only true when the status moved
  // to confirmed. If it moved to cancelled instead -- the 15-minute hold
  // (src/lib/booking/actions.ts createPendingBooking) lazily expired via
  // releaseExpiredHolds (src/lib/therapist/queries.ts) before a late webhook
  // delivery, a slow Paystack redirect, or a retry after an outage landed --
  // the charge was real but nothing in Hayven ever recorded it: no payments
  // row, no booking, no refund-queue entry, no alert. handleMissedConfirmation
  // is what closes that gap.
  const handleMissedConfirmation = async (): Promise<ActionResult<object>> => {
    const { data: current } = await admin.from("bookings").select("status").eq("id", bookingId).maybeSingle();
    if (!current || current.status === "confirmed") {
      return { ok: true }; // genuinely already finalized by a prior call
    }
    if (current.status !== "cancelled") {
      // pending_payment can in practice only become confirmed or cancelled
      // -- never drop a real charge silently for a status this doesn't
      // recognize.
      Sentry.captureMessage("Paystack confirmation landed on a booking in an unexpected status", {
        level: "error",
        tags: { anomaly: "unexpected_booking_status_on_payment" },
        extra: { bookingId, status: current.status, gatewayReference },
      });
      return { ok: false, error: `Booking is in an unexpected state (${current.status}).` };
    }

    // The hold expired (or the parent cancelled while unpaid) before this
    // payment landed. Try to win the slot back first -- if nobody else has
    // taken it, the paying parent shouldn't lose their spot just because
    // confirmation was slow. Same atomic-claim pattern as createPendingBooking.
    const { data: reclaimed } = await admin
      .from("availability_slots")
      .update({ is_booked: true })
      .eq("id", booking.availability_slot_id)
      .eq("is_booked", false)
      .select("id")
      .maybeSingle();

    if (reclaimed) {
      const { data: revived } = await admin
        .from("bookings")
        .update({
          status: "confirmed",
          meeting_link: meetingLink,
          expires_at: null,
          cancelled_at: null,
          cancellation_reason: null,
        })
        .eq("id", bookingId)
        .eq("status", "cancelled")
        .select("id")
        .maybeSingle();
      if (revived) {
        await applyConfirmedBookingEffects();
        return { ok: true };
      }
      // Lost a race putting the booking back (nothing else writes
      // bookings.status for an already-cancelled row, so this should be
      // unreachable) -- don't leave the slot falsely held.
      await admin.from("availability_slots").update({ is_booked: false }).eq("id", booking.availability_slot_id);
    }

    // The slot is gone -- someone else booked it during the gap -- and the
    // parent was genuinely charged for nothing. Record the payment so this
    // enters the existing refund queue (getBookingsNeedingRefund,
    // src/lib/admin/queries.ts) instead of leaving no trace at all, apply
    // the "not the parent's fault" full-refund tier (same tier a
    // therapist-initiated cancellation gets), and alert immediately instead
    // of relying on anyone to notice the queue.
    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: bookingId,
      payer_id: booking.parent_id,
      payee_id: therapistProfile?.user_id ?? null,
      amount: Math.round(amountKobo / 100),
      type: "session_commission",
      gateway_reference: gatewayReference,
      status: "successful",
    });
    if (paymentError) {
      if (paymentError.code === "23505") {
        // gateway_reference is unique -- this exact charge was already
        // recorded by a concurrent call (the webhook and the redirect path
        // landing near-simultaneously, both racing the slot-reclaim above).
        // If that other call is the one that actually won the reclaim, the
        // booking is genuinely confirmed now and this call shouldn't also
        // fire a false "you'll be refunded" notification and Sentry alert
        // for a booking that's actually fine.
        const { data: recheck } = await admin.from("bookings").select("status").eq("id", bookingId).maybeSingle();
        if (recheck?.status === "confirmed") return { ok: true };
      } else {
        Sentry.captureMessage("Failed to record an orphaned Paystack charge", {
          level: "error",
          tags: { anomaly: "orphaned_payment_record_failed" },
          extra: { bookingId, gatewayReference, dbError: paymentError.message },
        });
        return { ok: false, error: paymentError.message };
      }
    }

    await applyRefundPolicy(admin, bookingId, "therapist", slot?.start_time ?? null);
    await admin
      .from("bookings")
      .update({ cancellation_reason: "hold_expired_before_payment_confirmed" })
      .eq("id", bookingId)
      .is("cancellation_reason", null);

    await createNotification({
      userId: booking.parent_id,
      type: "booking_confirmed",
      title: "Payment received, but the slot was lost",
      body: `We received your payment for ${child?.first_name ?? "your child"}'s session, but the hold on that time slot had already expired and it's no longer available. You'll be refunded in full -- we're sorry for the mix-up.`,
      url: "/parent/sessions",
    });

    Sentry.captureMessage("Paystack payment confirmed after the booking hold had already expired", {
      level: "error",
      tags: { anomaly: "orphaned_payment" },
      extra: { bookingId, gatewayReference, amountKobo },
    });

    return { ok: false, error: "The booking hold expired before payment was confirmed; a refund has been recorded." };
  };

  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ status: "confirmed", meeting_link: meetingLink, expires_at: null })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return handleMissedConfirmation();

  await applyConfirmedBookingEffects();
  return { ok: true };
}

/**
 * Applies the cancellation refund policy (src/lib/booking/refund-policy.ts):
 * finds the paid amount, computes what the parent is owed, and records it on
 * the booking (`refund_amount`). The actual money movement is still manual
 * (admin refund queue) until the Paystack refund API is wired in -- this
 * just makes the amount deterministic and visible instead of "the team will
 * work it out". Returns null for an unpaid booking (nothing to refund).
 */
async function applyRefundPolicy(
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

function refundNotificationBody(childName: string, when: string, outcome: RefundOutcome, byTherapist: boolean): string {
  const lead = byTherapist
    ? `${childName}'s session on ${when} was cancelled by the therapist.`
    : `${childName}'s session on ${when} is cancelled.`;
  if (outcome.refundNaira <= 0) {
    return `${lead} No refund applies for a cancellation this close to the session.`;
  }
  const feeNote =
    outcome.feeNaira > 0
      ? ` The Paystack processing fee (${formatNaira(outcome.feeNaira)}) is non-refundable.`
      : "";
  const tierNote =
    outcome.tier === "partial" ? " (50%, as it was within 24 hours of the start time)" : "";
  return `${lead} A refund of ${formatNaira(outcome.refundNaira)}${tierNote} will be sent to your card, usually within 5-10 business days.${feeNote}`;
}

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
    // what was retained (excluding the non-earnable Paystack fee).
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
