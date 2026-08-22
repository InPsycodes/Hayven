"use server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction, verifyTransaction } from "@/lib/payments/paystack";
import { finalizeBookingPayment } from "@/lib/booking/actions";
import { checkRateLimit } from "@/lib/rate-limit/check";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
    .select("id, parent_id, therapist_id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.parent_id !== session.userId) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "pending_payment") {
    return { ok: false, error: "This booking has already been processed." };
  }

  const [{ data: parentUser }, { data: therapistProfile }] = await Promise.all([
    admin.from("users").select("email").eq("id", session.userId).maybeSingle(),
    admin.from("therapist_profiles").select("price_per_session").eq("id", booking.therapist_id).maybeSingle(),
  ]);
  if (!parentUser || !therapistProfile) {
    return { ok: false, error: "Couldn't load payment details. Please try again." };
  }

  const reference = `hv_${bookingId}_${Date.now()}`;

  try {
    const result = await initializeTransaction({
      email: parentUser.email,
      amountNaira: therapistProfile.price_per_session,
      reference,
      callbackUrl: `${SITE_URL}/book/${therapistId}/confirmation?bookingId=${bookingId}`,
      metadata: { booking_id: bookingId, parent_id: session.userId },
    });
    return { ok: true, authorizationUrl: result.authorizationUrl };
  } catch (err) {
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
