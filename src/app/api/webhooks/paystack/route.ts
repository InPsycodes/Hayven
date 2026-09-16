import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { finalizeBookingPayment } from "@/lib/booking/actions";
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

  if (event.event === "charge.success") {
    const metadata = event.data?.metadata as { booking_id?: unknown } | undefined;
    const bookingId = metadata?.booking_id;
    const reference = event.data?.reference;
    const amountKobo = event.data?.amount;
    if (typeof bookingId === "string" && typeof reference === "string" && typeof amountKobo === "number") {
      await finalizeBookingPayment(bookingId, reference, amountKobo);
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

  return NextResponse.json({ received: true });
}
