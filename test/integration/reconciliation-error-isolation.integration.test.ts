import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { paystackMock } from "./mocks";
import { cleanupAll } from "./helpers";

const finalizeBookingPaymentMock = vi.fn();
vi.mock("@/lib/booking/finalize-payment", () => ({
  finalizeBookingPayment: (...args: unknown[]) => finalizeBookingPaymentMock(...args),
}));

beforeEach(() => {
  paystackMock.listSuccessfulTransactions.mockClear();
  finalizeBookingPaymentMock.mockClear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupAll();
});

// BOOK-06 regression (pre-launch audit, P1): the forward-direction
// reconciliation loop had no per-iteration error handling -- a single
// finalizeBookingPayment call throwing (as opposed to a clean {ok:false})
// aborted the whole `for` loop, leaving every remaining transaction in
// that run's batch unprocessed until the next scheduled run.
describe("BOOK-06 regression: one bad transaction doesn't abort the rest of a reconciliation run", () => {
  it("keeps processing the remaining transactions after one throws", async () => {
    const { reconcilePaystackPayments } = await import("@/lib/payments/reconciliation");

    paystackMock.listSuccessfulTransactions.mockResolvedValueOnce([
      {
        reference: "test_reconcile_throws",
        status: "success",
        amountKobo: 1500000,
        metadata: { booking_id: "00000000-0000-0000-0000-000000000010" },
      },
      {
        reference: "test_reconcile_succeeds",
        status: "success",
        amountKobo: 1200000,
        metadata: { booking_id: "00000000-0000-0000-0000-000000000011" },
      },
    ]);

    finalizeBookingPaymentMock.mockImplementationOnce(() => {
      throw new Error("transient DB error mid-batch");
    });
    finalizeBookingPaymentMock.mockResolvedValueOnce({ ok: true });

    const result = await reconcilePaystackPayments();

    // Both transactions were attempted -- the throw on the first one didn't
    // stop the loop before it reached the second.
    expect(finalizeBookingPaymentMock).toHaveBeenCalledTimes(2);
    expect(result.paystackChecked).toBe(2);
    expect(result.replayed).toBe(1);
    expect(result.stillUnresolved).toBe(1);
  });
});
