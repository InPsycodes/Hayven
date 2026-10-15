import "server-only";

import * as Sentry from "@sentry/nextjs";

import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeBookingPayment } from "@/lib/booking/finalize-payment";
import { verifyTransaction, type FlwTransaction } from "@/lib/payments/flutterwave";
import { bookingIdFromTxRef } from "@/lib/payments/flutterwave-shared";

export type ConfirmResult = { ok: true } | { ok: false; error: string };

/**
 * The one path from "Flutterwave says a payment happened" to a confirmed
 * booking, shared by the webhook, the redirect back from checkout and the
 * reconciliation sweep. Never trusts what the caller was told: it asks
 * Flutterwave for the transaction itself, then checks the status, the
 * currency, which booking it's for (from our own tx_ref) and that the
 * amount covers the price held on the booking.
 *
 * Not a Server Action (no "use server"): it confirms real money and must
 * never be callable from a browser.
 */
export async function confirmFlutterwavePayment(
  transactionId: string,
  alreadyVerified?: FlwTransaction
): Promise<ConfirmResult> {
  let txn: FlwTransaction;
  try {
    txn = alreadyVerified ?? (await verifyTransaction(transactionId));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't verify the payment." };
  }

  if (txn.status !== "successful") return { ok: false, error: `Payment is ${txn.status}.` };

  const bookingId = bookingIdFromTxRef(txn.txRef);
  if (!bookingId) return { ok: false, error: "Not a Hayven booking payment." };

  if (txn.currency !== "NGN") {
    Sentry.captureMessage("Flutterwave payment in an unexpected currency", {
      level: "error",
      tags: { anomaly: "payment_wrong_currency" },
      extra: { bookingId, transactionId: txn.id, currency: txn.currency },
    });
    return { ok: false, error: "Payment was not in naira." };
  }

  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("price_naira").eq("id", bookingId).maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.price_naira != null && txn.amountNaira < booking.price_naira) {
    // The checkout link fixes the amount, so this shouldn't happen; if it
    // does, a person decides rather than the booking confirming for less.
    Sentry.captureMessage("Flutterwave payment smaller than the booking price", {
      level: "error",
      tags: { anomaly: "payment_underpaid" },
      extra: { bookingId, transactionId: txn.id, paid: txn.amountNaira, price: booking.price_naira },
    });
    return { ok: false, error: "Payment was less than the session price." };
  }

  return finalizeBookingPayment(bookingId, {
    reference: txn.txRef,
    transactionId: txn.id,
    amountNaira: txn.amountNaira,
  });
}
