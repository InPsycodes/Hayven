import "server-only";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { captureServer } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { formatDateTime, formatNaira } from "@/data/format";
import { applyRefundPolicy } from "@/lib/booking/refund-apply";

type ActionResult<T> = { ok: true } & T | { ok: false; error: string };

// BOOK-02, pre-launch audit (P1): this used to live in booking/actions.ts, a
// "use server" file imported by client components for its OTHER exports
// (createPendingBooking, etc.) -- which puts the whole module on the
// client-reference graph. finalizeBookingPayment itself is only ever called
// from server-only contexts (confirmFlutterwavePayment in payments/confirm.ts,
// used by the webhook route, the checkout redirect and the reconciliation sweep), never a
// client component, so per-export dead-code elimination SHOULD strip its
// action id from the built client bundle -- but Next's own docs warn not to
// rely on that alone for something this sensitive: "you should still treat
// Server Actions as reachable via direct POST requests and verify
// authentication and authorization inside each one." This function
// confirms real money; the charge is re-verified with Flutterwave by its
// caller, not in here, so if it were ever reachable, a caller could confirm any
// bookingId with a self-chosen amount. Moving it into a plain server-only
// module (no "use server", so it never gets a Server Action id at all) is
// the same Data Access Layer pattern those docs recommend, and is a
// stronger guarantee than a build-time optimization.
export async function finalizeBookingPayment(
  bookingId: string,
  payment: {
    /** Our tx_ref: the unique key for this charge in the payments table. */
    reference: string;
    /** Flutterwave's transaction id, needed later for refunds. */
    transactionId: string;
    amountNaira: number;
  }
): Promise<ActionResult<object>> {
  const admin = createAdminClient();
  const gatewayReference = payment.reference;
  const amountNaira = Math.round(payment.amountNaira);

  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, parent_id, therapist_id, child_id, session_type, availability_slot_id, children(first_name), availability_slots(start_time), therapist_profiles(user_id, users(full_name, status))"
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
    users: { full_name: string; status: string } | null;
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
      amount: amountNaira,
      type: "session_commission",
      gateway: "flutterwave",
      gateway_reference: gatewayReference,
      gateway_transaction_id: payment.transactionId,
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
        body: `You received ${formatNaira(amountNaira)} for your session with ${child?.first_name ?? "a client"}.`,
        url: "/therapist/earnings",
      });
    }

    await captureServer(booking.parent_id, ANALYTICS_EVENTS.bookingPaid, {
      amount_naira: amountNaira,
      session_type: booking.session_type ?? undefined,
    });

    revalidatePath("/parent");
    revalidatePath("/parent/sessions");
    revalidatePath("/therapist/schedule");
    revalidatePath("/therapist/caseload");
  };

  // Shared by both "unaccounted charge" scenarios below: a real Flutterwave
  // charge landed but nothing in Hayven has a record of THIS SPECIFIC
  // gatewayReference yet. Records it, queues a full refund (the existing
  // "not the parent's fault" tier), notifies the parent, and alerts --
  // instead of the charge vanishing into an inconsistent state silently.
  const recordUnaccountedCharge = async (params: {
    anomalyTag: string;
    sentryMessage: string;
    cancellationReason: string | null;
    // false for a duplicate charge on a booking that stays confirmed --
    // applyRefundPolicy expects exactly one successful payment row per
    // booking (it errors on more than one) and writes to bookings.refund_amount,
    // a single column meant for "this booking's own cancellation refund."
    // A duplicate charge isn't a cancellation and needs its own refund
    // surfaced independently (see getBookingsNeedingRefund's duplicate-
    // payment branch) -- reusing the cancellation-policy machinery here
    // would either crash on the .maybeSingle() or silently overwrite an
    // unrelated refund amount.
    applyCancellationRefundPolicy: boolean;
    notificationTitle: string;
    notificationBody: string;
  }): Promise<ActionResult<object>> => {
    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: bookingId,
      payer_id: booking.parent_id,
      payee_id: therapistProfile?.user_id ?? null,
      amount: amountNaira,
      type: "session_commission",
      gateway: "flutterwave",
      gateway_reference: gatewayReference,
      gateway_transaction_id: payment.transactionId,
      status: "successful",
    });
    if (paymentError) {
      if (paymentError.code === "23505") {
        // gateway_reference is unique -- a concurrent call already recorded
        // this exact charge. Nothing left to do.
        return { ok: true };
      }
      Sentry.captureMessage("Failed to record an unaccounted Flutterwave charge", {
        level: "error",
        tags: { anomaly: "orphaned_payment_record_failed" },
        extra: { bookingId, gatewayReference, dbError: paymentError.message },
      });
      return { ok: false, error: paymentError.message };
    }

    if (params.applyCancellationRefundPolicy) {
      await applyRefundPolicy(admin, bookingId, "therapist", slot?.start_time ?? null);
    }
    if (params.cancellationReason) {
      await admin
        .from("bookings")
        .update({ cancellation_reason: params.cancellationReason })
        .eq("id", bookingId)
        .is("cancellation_reason", null);
    }

    await createNotification({
      userId: booking.parent_id,
      type: "booking_confirmed",
      title: params.notificationTitle,
      body: params.notificationBody,
      url: "/parent/sessions",
    });

    Sentry.captureMessage(params.sentryMessage, {
      level: "error",
      tags: { anomaly: params.anomalyTag },
      extra: { bookingId, gatewayReference, amountNaira },
    });

    return { ok: false, error: "A refund has been recorded for this payment." };
  };

  // E2, external PRD review: this used to treat any miss here ("status is no
  // longer pending_payment") as "already finalized by a prior call" and
  // return ok:true unconditionally. That's only true when the status moved
  // to confirmed. If it moved to cancelled instead -- the 15-minute hold
  // (src/lib/booking/actions.ts createPendingBooking) lazily expired via
  // releaseExpiredHolds (src/lib/therapist/queries.ts) before a late webhook
  // delivery, a slow Flutterwave redirect, or a retry after an outage landed --
  // the charge was real but nothing in Hayven ever recorded it: no payments
  // row, no booking, no refund-queue entry, no alert. handleMissedConfirmation
  // is what closes that gap.
  const handleMissedConfirmation = async (): Promise<ActionResult<object>> => {
    const { data: current } = await admin.from("bookings").select("status").eq("id", bookingId).maybeSingle();
    if (!current) {
      return { ok: true }; // booking genuinely gone -- nothing to do
    }

    if (current.status === "confirmed") {
      // BOOK-01, pre-launch audit (P0): "the booking is confirmed" used to
      // be treated as proof THIS charge was accounted for. It isn't --
      // initiateFlutterwavePayment's lock (now matched to the hold TTL, see
      // that file) used to let a retried checkout mint a second, genuinely
      // different gatewayReference for the same booking. If a *different*
      // reference already won the confirmation race, this specific charge
      // is still real money nothing has recorded yet.
      const { data: existingPayment } = await admin
        .from("payments")
        .select("id")
        .eq("gateway_reference", gatewayReference)
        .maybeSingle();
      if (existingPayment) {
        return { ok: true }; // this exact charge is the one that won -- already handled
      }
      return recordUnaccountedCharge({
        anomalyTag: "duplicate_charge_on_confirmed_booking",
        sentryMessage: "A second real Flutterwave charge landed on an already-confirmed booking",
        cancellationReason: null,
        applyCancellationRefundPolicy: false,
        notificationTitle: "You may have been charged twice",
        notificationBody: `We found a second payment for ${child?.first_name ?? "your child"}'s already-confirmed session. You'll be refunded in full for the duplicate charge -- we're sorry for the mix-up.`,
      });
    }

    if (current.status !== "cancelled") {
      // pending_payment can in practice only become confirmed or cancelled
      // -- never drop a real charge silently for a status this doesn't
      // recognize.
      Sentry.captureMessage("Flutterwave confirmation landed on a booking in an unexpected status", {
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
    // parent was genuinely charged for nothing.
    return recordUnaccountedCharge({
      anomalyTag: "orphaned_payment",
      sentryMessage: "Flutterwave payment confirmed after the booking hold had already expired",
      cancellationReason: "hold_expired_before_payment_confirmed",
      applyCancellationRefundPolicy: true,
      notificationTitle: "Payment received, but the slot was lost",
      notificationBody: `We received your payment for ${child?.first_name ?? "your child"}'s session, but the hold on that time slot had already expired and it's no longer available. You'll be refunded in full -- we're sorry for the mix-up.`,
    });
  };

  // BOOK-04, pre-launch audit (P1): never confirm a booking against a
  // therapist who's been suspended or offboarded, however this call
  // reached us -- a fresh payment landing in the narrow window right after
  // offboarding (before cancelBookingsForDepartedTherapist's cascade
  // reaches this specific hold), or a late/reclaim-path payment on a hold
  // that cascade already cancelled, which would otherwise let
  // handleMissedConfirmation's slot-reclaim below silently revive it.
  // Checked first, before either path, rather than threading a
  // "don't revive" flag through the cancellation_reason.
  if (therapistProfile?.users && therapistProfile.users.status !== "active") {
    await admin
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", bookingId)
      .neq("status", "cancelled");
    await admin.from("availability_slots").update({ is_booked: false }).eq("id", booking.availability_slot_id);
    return recordUnaccountedCharge({
      anomalyTag: "payment_against_inactive_therapist",
      sentryMessage: "A Flutterwave charge landed for a booking whose therapist is no longer active",
      cancellationReason: "therapist_no_longer_active",
      applyCancellationRefundPolicy: false,
      notificationTitle: "Your therapist is no longer available",
      notificationBody: `${therapistProfile.users.full_name || "Your therapist"} is no longer on Hayven, so this session with ${child?.first_name ?? "your child"} couldn't be confirmed. You'll be refunded in full -- we're sorry for the mix-up.`,
    });
  }

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
