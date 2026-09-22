import crypto from "node:crypto";

import { NextRequest } from "next/server";
import { describe, it, expect, afterEach, vi } from "vitest";

import { testAdminClient, trackForCleanup, cleanupAll } from "./helpers";

const finalizeBookingPaymentMock = vi.fn();
vi.mock("@/lib/booking/finalize-payment", () => ({
  finalizeBookingPayment: (...args: unknown[]) => finalizeBookingPaymentMock(...args),
}));

const admin = testAdminClient;

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupAll();
});

function signedRequest(body: string) {
  const signature = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(body).digest("hex");
  return new NextRequest("http://localhost/api/webhooks/paystack", {
    method: "POST",
    body,
    headers: { "x-paystack-signature": signature },
  });
}

// BOOK-05 regression (pre-launch audit, P1): the dedup row was inserted
// BEFORE processing -- if processing threw (a genuine exception, not a
// clean {ok:false}), the exception propagated uncaught, Paystack would
// retry with the identical (body, signature) pair, and that retry's dedup
// insert collided against the row already written on the FIRST attempt --
// silently swallowed as "duplicate" without the payment ever actually
// being processed.
describe("BOOK-05 regression: a processing exception releases the webhook dedup claim for retry", () => {
  it("deletes the dedup row on a thrown exception, so an identical retry can actually reprocess", async () => {
    const { POST } = await import("@/app/api/webhooks/paystack/route");

    const reference = `test_webhook_dedup_${Date.now()}`;
    const bodyObj = {
      event: "charge.success",
      data: { reference, amount: 1500000, metadata: { booking_id: "00000000-0000-0000-0000-000000000000" } },
    };
    const body = JSON.stringify(bodyObj);
    const signature = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(body).digest("hex");

    finalizeBookingPaymentMock.mockRejectedValueOnce(new Error("transient DB error"));
    const firstResponse = await POST(signedRequest(body));
    expect(firstResponse.status).toBe(500);

    const { data: afterFailure } = await admin
      .from("paystack_webhook_events")
      .select("signature")
      .eq("signature", signature)
      .maybeSingle();
    expect(afterFailure).toBeNull(); // claim released, not left dangling

    finalizeBookingPaymentMock.mockResolvedValueOnce({ ok: true });
    const secondResponse = await POST(signedRequest(body));
    expect(secondResponse.status).toBe(200);
    expect(finalizeBookingPaymentMock).toHaveBeenCalledTimes(2); // the retry actually reprocessed, not swallowed as a dup

    const { data: afterRetry } = await admin
      .from("paystack_webhook_events")
      .select("signature")
      .eq("signature", signature)
      .maybeSingle();
    expect(afterRetry?.signature).toBe(signature);
    trackForCleanup("paystack_webhook_events", signature, "signature");
  });

  it("does NOT release the dedup claim for a clean {ok:false} -- only a real exception", async () => {
    const { POST } = await import("@/app/api/webhooks/paystack/route");

    const reference = `test_webhook_dedup_clean_${Date.now()}`;
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference, amount: 1500000, metadata: { booking_id: "00000000-0000-0000-0000-000000000001" } },
    });
    const signature = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(body).digest("hex");

    finalizeBookingPaymentMock.mockResolvedValueOnce({ ok: false, error: "Booking not found." });
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(200); // Paystack still gets a 200 -- no retry storm for an already-alerted case

    const { data: dedupRow } = await admin
      .from("paystack_webhook_events")
      .select("signature")
      .eq("signature", signature)
      .maybeSingle();
    expect(dedupRow?.signature).toBe(signature); // claim stands -- a retry would just re-trigger the same handling
    trackForCleanup("paystack_webhook_events", signature, "signature");
  });
});
