import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { finalizeBookingPayment } from "@/lib/booking/finalize-payment";
import { finalizeRefund } from "@/lib/booking/webhook-refund";
import { finalizeTransfer } from "@/lib/payouts/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Malformed body from something holding a valid signature is odd but
    // not harmful -- Paystack retries on a non-2xx, so just reject cleanly
    // instead of throwing an unhandled 500 (L-7, production audit
    // 2026-09-03).
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  // HMAC-SHA512 over the exact raw body, so an identical delivery (Paystack
  // retry, or a captured valid (body, signature) pair replayed later)
  // produces the exact same signature -- use it as the idempotency key. The
  // unique constraint on paystack_webhook_events.signature is what actually
  // enforces this atomically; the admin client bypasses RLS the same as
  // every other webhook write in this codebase (L-7, production audit
  // 2026-09-03: no replay protection existed at all before this).
  const admin = createAdminClient();
  const { error: dedupError } = await admin
    .from("paystack_webhook_events")
    .insert({ signature, event_type: event.event ?? "unknown" });
  if (dedupError) {
    // 23505 = unique_violation -- already processed this exact delivery.
    // Any other error (table not migrated yet) fails open so a legitimate
    // webhook still gets processed rather than silently dropped.
    if (dedupError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("paystack webhook dedup insert failed, processing anyway", dedupError.message);
  }

  // BOOK-05, pre-launch audit (P1): the dedup row above is inserted BEFORE
  // processing, and neither of these branches was wrapped -- if the
  // processing itself threw (e.g. a transient DB error inside
  // finalizeBookingPayment's own initial read, before it could even try),
  // the exception propagated uncaught, Paystack saw a non-2xx and retried
  // with the identical (body, signature) pair, and that retry's dedup
  // insert collided against the row already written on the FIRST attempt
  // -- silently swallowed as "duplicate" without the payment ever actually
  // being processed by the one delivery capable of confirming it. A
  // processing failure isn't the same thing as "already handled"; only a
  // genuine repeat delivery is. On a real exception here, undo the dedup
  // claim so Paystack's retry can actually reprocess it.
  try {
    if (event.event === "charge.success") {
      const metadata = event.data?.metadata as { booking_id?: unknown } | undefined;
      const bookingId = metadata?.booking_id;
      const reference = event.data?.reference;
      const amountKobo = event.data?.amount;
      if (typeof bookingId === "string" && typeof reference === "string" && typeof amountKobo === "number") {
        const result = await finalizeBookingPayment(bookingId, reference, amountKobo);
        // Paystack still gets 200 below either way -- a non-2xx here would just
        // make it retry a charge that's already Sentry-alerted and, for the
        // orphaned-payment case, already in the refund queue (E2). This is
        // purely so the failure shows up in server logs too, not only Sentry.
        // Distinct from the catch below: this is a clean `{ok: false}`
        // return, not a thrown exception -- finalizeBookingPayment already
        // recorded/alerted/refunded as appropriate, so the dedup claim
        // should stand; retrying would only re-trigger that same handling.
        if (!result.ok) {
          console.error("finalizeBookingPayment did not succeed", { bookingId, reference, error: result.error });
        }
      }
    } else if (
      event.event === "transfer.success" ||
      event.event === "transfer.failed" ||
      event.event === "transfer.reversed"
    ) {
      await finalizeTransfer(
        event.event,
        typeof event.data?.reference === "string" ? event.data.reference : undefined,
        typeof event.data?.transfer_code === "string" ? event.data.transfer_code : undefined
      );
    } else if (
      event.event === "refund.processed" ||
      event.event === "refund.failed" ||
      event.event === "refund.pending"
    ) {
      const transaction = event.data?.transaction as { reference?: unknown } | undefined;
      const ref =
        (typeof event.data?.transaction_reference === "string" && event.data.transaction_reference) ||
        (typeof transaction?.reference === "string" && transaction.reference) ||
        undefined;
      await finalizeRefund(event.event, ref);
    }
  } catch (err) {
    if (signature) {
      await admin.from("paystack_webhook_events").delete().eq("signature", signature);
    }
    Sentry.captureMessage("Paystack webhook processing threw -- dedup claim released for retry", {
      level: "error",
      tags: { anomaly: "webhook_processing_threw" },
      extra: { event: event.event, thrown: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
