import { NextRequest } from "next/server";
import { describe, it, expect, afterEach, vi } from "vitest";

import { testAdminClient, trackForCleanup, cleanupAll } from "./helpers";

// mocks.ts (a setup file) already fakes the Flutterwave client, including
// verifyWebhookHash, so any verif-hash header is accepted here.
const confirmMock = vi.fn();
vi.mock("@/lib/payments/confirm", () => ({
  confirmFlutterwavePayment: (...args: unknown[]) => confirmMock(...args),
}));

const admin = testAdminClient;

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupAll();
});

function webhookRequest(body: string) {
  return new NextRequest("http://localhost/api/webhooks/flutterwave", {
    method: "POST",
    body,
    headers: { "verif-hash": "test-hash" },
  });
}

function chargeCompleted(id: number) {
  return JSON.stringify({
    event: "charge.completed",
    data: { id, tx_ref: `hv_00000000-0000-0000-0000-000000000000_${id}`, status: "successful", amount: 15000, currency: "NGN" },
  });
}

// BOOK-05 regression (pre-launch audit, P1): the dedup row is inserted
// BEFORE processing -- if processing threw (a genuine exception, not a clean
// {ok:false}), Flutterwave's retry of the same event collided with the row
// from the first attempt and was swallowed as a "duplicate" without the
// payment ever being processed.
describe("BOOK-05 regression: a processing exception releases the webhook dedup claim for retry", () => {
  it("deletes the dedup row on a thrown exception, so the retry can actually reprocess", async () => {
    const { POST } = await import("@/app/api/webhooks/flutterwave/route");
    const id = Date.now();
    const eventKey = `charge.completed:${id}:successful`;

    confirmMock.mockRejectedValueOnce(new Error("transient DB error"));
    const firstResponse = await POST(webhookRequest(chargeCompleted(id)));
    expect(firstResponse.status).toBe(500);

    const { data: afterFailure } = await admin
      .from("payment_webhook_events")
      .select("event_key")
      .eq("event_key", eventKey)
      .maybeSingle();
    expect(afterFailure).toBeNull(); // claim released, not left dangling

    confirmMock.mockResolvedValueOnce({ ok: true });
    const secondResponse = await POST(webhookRequest(chargeCompleted(id)));
    expect(secondResponse.status).toBe(200);
    expect(confirmMock).toHaveBeenCalledTimes(2); // the retry reprocessed, not swallowed as a dup

    const { data: afterRetry } = await admin
      .from("payment_webhook_events")
      .select("event_key")
      .eq("event_key", eventKey)
      .maybeSingle();
    expect(afterRetry?.event_key).toBe(eventKey);
    trackForCleanup("payment_webhook_events", eventKey, "event_key");
  });

  it("does NOT release the dedup claim for a clean {ok:false} -- only a real exception", async () => {
    const { POST } = await import("@/app/api/webhooks/flutterwave/route");
    const id = Date.now() + 1;
    const eventKey = `charge.completed:${id}:successful`;

    confirmMock.mockResolvedValueOnce({ ok: false, error: "Booking not found." });
    const response = await POST(webhookRequest(chargeCompleted(id)));
    expect(response.status).toBe(200); // a 200 -- no retry storm for an already-alerted case

    const { data: dedupRow } = await admin
      .from("payment_webhook_events")
      .select("event_key")
      .eq("event_key", eventKey)
      .maybeSingle();
    expect(dedupRow?.event_key).toBe(eventKey); // claim stands
    trackForCleanup("payment_webhook_events", eventKey, "event_key");
  });
});

// Flutterwave sends the same secret hash on every delivery, so (unlike
// Paystack's per-body signature) the header can't tell deliveries apart.
// The event key must: a repeat of one event is skipped, a different event
// with the identical header is still processed.
describe("Flutterwave webhook de-duplication is per event, not per header", () => {
  it("skips a repeat delivery but processes a different event with the same header", async () => {
    const { POST } = await import("@/app/api/webhooks/flutterwave/route");
    const first = Date.now() + 2;
    const second = Date.now() + 3;

    confirmMock.mockResolvedValue({ ok: true });
    expect((await POST(webhookRequest(chargeCompleted(first)))).status).toBe(200);
    const repeat = await POST(webhookRequest(chargeCompleted(first)));
    expect(await repeat.json()).toMatchObject({ duplicate: true });
    expect((await POST(webhookRequest(chargeCompleted(second)))).status).toBe(200);

    expect(confirmMock).toHaveBeenCalledTimes(2); // first and second, not the repeat
    trackForCleanup("payment_webhook_events", `charge.completed:${first}:successful`, "event_key");
    trackForCleanup("payment_webhook_events", `charge.completed:${second}:successful`, "event_key");
  });
});
