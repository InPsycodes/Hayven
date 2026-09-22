"use server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction, verifyTransaction } from "@/lib/payments/paystack";
import { finalizeBookingPayment } from "@/lib/booking/finalize-payment";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { SITE_URL } from "@/lib/seo/metadata";

export async function initiatePaystackPayment(
  bookingId: string,
  therapistId: string
): Promise<{ ok: true; authorizationUrl: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to pay for a session." };
  }

  // Each call creates a real transaction on Paystack's side, an external
  // paid API -- bounded loosely by the booking_hold limit already (can't
  // pay for more bookings than you can create), but repeated calls against
  // the same pending booking aren't capped by that.
  const rateLimitOk = await checkRateLimit(`payment-init:${session.userId}`, 15, 10 * 60);
  if (!rateLimitOk) return { ok: false, error: "Too many attempts. Please try again in a few minutes." };

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, parent_id, therapist_id, status, price_naira")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.parent_id !== session.userId) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "pending_payment") {
    return { ok: false, error: "This booking has already been processed." };
  }

  // Atomic claim on payment_initiated_at -- prevents two concurrent Paystack
  // transactions for the same booking (double-click, two tabs, a refresh
  // mid-checkout). Only succeeds if the lock is unset or stale (older than
  // PAYMENT_LOCK_STALE_MS, treated as an abandoned attempt); the condition
  // lives in the WHERE clause of the update itself, not a separate read-then-
  // write, so two simultaneous calls can't both pass the check.
  //
  // BOOK-01, pre-launch audit (P0): this used to be 5 minutes while the
  // booking hold below lasts 15 -- a parent who opened checkout, stalled,
  // and retried after 5 minutes (still well inside their own hold) got a
  // second, independent Paystack reference for the same booking. If both
  // ever got paid, the second real charge had nothing to invalidate the
  // first one, and finalizeBookingPayment's "already confirmed" check used
  // to drop that second charge with no record, no refund, no alert (now
  // fixed separately below). The actual failure mode is a genuine retry
  // during a stalled checkout, not a legitimate need for a second
  // *concurrent* attempt -- a real error already releases the lock
  // immediately in the catch block below. Matching this to the hold TTL
  // means a retry can never mint a second reference while the original
  // hold (and thus the original reference) is still alive.
  const PAYMENT_LOCK_STALE_MS = 15 * 60 * 1000;
  const staleCutoff = new Date(Date.now() - PAYMENT_LOCK_STALE_MS).toISOString();
  const { data: lockedBooking, error: lockError } = await admin
    .from("bookings")
    .update({ payment_initiated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .or(`payment_initiated_at.is.null,payment_initiated_at.lt.${staleCutoff}`)
    .select("id")
    .maybeSingle();
  if (lockError) return { ok: false, error: lockError.message };
  if (!lockedBooking) {
    return {
      ok: false,
      error: "A payment is already in progress for this booking. Please wait a moment, then refresh the page.",
    };
  }

  // Charge the price snapshotted onto the booking at hold time, not a fresh
  // read of therapist_profiles.price_per_session -- otherwise a price
  // change between the hold and payment silently changes what the parent
  // is charged (L-10, production audit 2026-09-03). Falls back to the live
  // price only for a booking created before the price_naira column existed.
  const [{ data: parentUser }, { data: therapistProfile }] = await Promise.all([
    admin.from("users").select("email").eq("id", session.userId).maybeSingle(),
    booking.price_naira == null
      ? admin.from("therapist_profiles").select("price_per_session").eq("id", booking.therapist_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const amountNaira = booking.price_naira ?? therapistProfile?.price_per_session;
  if (!parentUser || amountNaira == null) {
    return { ok: false, error: "Couldn't load payment details. Please try again." };
  }

  const reference = `hv_${bookingId}_${Date.now()}`;

  try {
    const result = await initializeTransaction({
      email: parentUser.email,
      amountNaira,
      reference,
      callbackUrl: `${SITE_URL}/book/${therapistId}/confirmation?bookingId=${bookingId}`,
      metadata: { booking_id: bookingId, parent_id: session.userId },
    });
    return { ok: true, authorizationUrl: result.authorizationUrl };
  } catch (err) {
    // Release the lock immediately on a genuine failure -- otherwise a
    // transient Paystack API error would leave the user unable to retry for
    // up to PAYMENT_LOCK_STALE_MS, not just blocked from a concurrent one.
    await admin.from("bookings").update({ payment_initiated_at: null }).eq("id", bookingId);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't start payment. Please try again.",
    };
  }
}

/**
 * Best-effort confirmation when Paystack redirects the parent back to the
 * confirmation page. The webhook (src/app/api/webhooks/paystack) is the
 * reliable backstop for cases where the browser closes before this runs.
 */
export async function finalizeFromReference(reference: string): Promise<void> {
  try {
    const result = await verifyTransaction(reference);
    const bookingId = result.metadata?.booking_id;
    if (result.status === "success" && typeof bookingId === "string") {
      await finalizeBookingPayment(bookingId, result.reference, result.amountKobo);
    }
  } catch {
    // Swallow -- the webhook will finalize this if the direct verify call fails.
  }
}
