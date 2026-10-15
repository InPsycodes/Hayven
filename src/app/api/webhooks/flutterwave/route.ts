import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { verifyWebhookHash } from "@/lib/payments/flutterwave";
import { webhookEventKey } from "@/lib/payments/flutterwave-shared";
import { confirmFlutterwavePayment } from "@/lib/payments/confirm";
import { finalizeRefundByTransaction } from "@/lib/booking/webhook-refund";
import { finalizeTransfer } from "@/lib/payouts/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Flutterwave webhooks: payments (charge.completed), payouts
 * (transfer.completed) and refunds (a payload with no `event` field,
 * recognised by its TransactionId/AmountRefunded fields).
 *
 * Flutterwave retries a delivery up to 3 times, 30 minutes apart, on
 * anything but a 200, and may send the same event more than once.
 */
export async function POST(req: NextRequest) {
  // The secret hash set in Flutterwave's dashboard, sent back unchanged.
  if (!verifyWebhookHash(req.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  const event = typeof body.event === "string" ? body.event : null;
  const isRefund = !event && ("TransactionId" in body || "AmountRefunded" in body);

  let eventKey: string | null = null;
  if (event === "charge.completed" || event === "transfer.completed") {
    eventKey = webhookEventKey(event, data.id as string | number | undefined, data.status as string | undefined);
  } else if (isRefund) {
    eventKey = webhookEventKey("refund", body.id as string | number | undefined, body.status as string | undefined);
  }
  if (!eventKey) {
    // Some other event type, or one without an id: nothing for Hayven to do.
    return NextResponse.json({ received: true, ignored: true });
  }

  // The same event for the same record in the same state is a repeat
  // delivery. The unique constraint on event_key enforces this atomically.
  const admin = createAdminClient();
  const { error: dedupError } = await admin
    .from("payment_webhook_events")
    .insert({ event_key: eventKey, event_type: event ?? "refund" });
  if (dedupError) {
    if (dedupError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    // Table missing (migration 0112 not run) or similar: process anyway
    // rather than silently drop a real payment.
    console.error("flutterwave webhook dedup insert failed, processing anyway", dedupError.message);
  }

  try {
    if (event === "charge.completed") {
      const id = data.id;
      if ((typeof id === "number" || typeof id === "string") && String(data.status).toLowerCase() === "successful") {
        // Re-verified with Flutterwave inside, never trusting the payload.
        const result = await confirmFlutterwavePayment(String(id));
        if (!result.ok) console.error("flutterwave charge not confirmed", { id, error: result.error });
      }
    } else if (event === "transfer.completed") {
      await finalizeTransfer(
        typeof data.status === "string" ? data.status : undefined,
        typeof data.reference === "string" ? data.reference : undefined,
        data.id !== undefined && data.id !== null ? String(data.id) : undefined
      );
    } else if (isRefund) {
      const transactionId = body.TransactionId;
      await finalizeRefundByTransaction(
        typeof body.status === "string" ? body.status : undefined,
        transactionId !== undefined && transactionId !== null ? String(transactionId) : undefined
      );
    }
  } catch (err) {
    // A processing failure isn't "already handled": release the claim so
    // Flutterwave's retry can process it.
    await admin.from("payment_webhook_events").delete().eq("event_key", eventKey);
    Sentry.captureMessage("Flutterwave webhook processing threw -- dedup claim released for retry", {
      level: "error",
      tags: { anomaly: "webhook_processing_threw" },
      extra: { event: event ?? "refund", thrown: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
