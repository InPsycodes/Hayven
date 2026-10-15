import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { flutterwaveMock } from "./mocks";
import { cleanupAll } from "./helpers";

const confirmMock = vi.fn();
vi.mock("@/lib/payments/confirm", () => ({
  confirmFlutterwavePayment: (...args: unknown[]) => confirmMock(...args),
}));

beforeEach(() => {
  flutterwaveMock.listSuccessfulTransactions.mockClear();
  confirmMock.mockClear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupAll();
});

// BOOK-06 regression (pre-launch audit, P1): the forward-direction
// reconciliation loop had no per-iteration error handling -- a single
// confirmation throwing (as opposed to a clean {ok:false}) aborted the
// whole `for` loop, leaving every remaining transaction in that run's batch
// unprocessed until the next scheduled run.
describe("BOOK-06 regression: one bad transaction doesn't abort the rest of a reconciliation run", () => {
  it("keeps processing the remaining transactions after one throws", async () => {
    const { reconcilePayments } = await import("@/lib/payments/reconciliation");

    flutterwaveMock.listSuccessfulTransactions.mockResolvedValueOnce([
      {
        id: "9000000010",
        txRef: "hv_00000000-0000-0000-0000-000000000010_1",
        status: "successful",
        amountNaira: 15000,
        currency: "NGN",
      },
      {
        id: "9000000011",
        txRef: "hv_00000000-0000-0000-0000-000000000011_1",
        status: "successful",
        amountNaira: 12000,
        currency: "NGN",
      },
    ]);

    confirmMock.mockImplementationOnce(() => {
      throw new Error("transient DB error mid-batch");
    });
    confirmMock.mockResolvedValueOnce({ ok: true });

    const result = await reconcilePayments();

    // Both transactions were attempted -- the throw on the first one didn't
    // stop the loop before it reached the second.
    expect(confirmMock).toHaveBeenCalledTimes(2);
    expect(result.gatewayChecked).toBe(2);
    expect(result.replayed).toBe(1);
    expect(result.stillUnresolved).toBe(1);
  });
});
