import { describe, expect, it } from "vitest";

import { bookingIdFromTxRef, bookingTxRef, refundOutcome, transferOutcome, webhookEventKey } from "./flutterwave-shared";

const BOOKING = "16e1736b-4612-4e2b-b96e-7c307655c68f";

describe("bookingTxRef / bookingIdFromTxRef", () => {
  it("round-trips the booking id", () => {
    expect(bookingIdFromTxRef(bookingTxRef(BOOKING, 1760000000000))).toBe(BOOKING);
  });

  it("rejects anything that isn't one of our booking references", () => {
    expect(bookingIdFromTxRef("payout_abc_123")).toBeNull();
    expect(bookingIdFromTxRef(`hv_${BOOKING}`)).toBeNull();
    expect(bookingIdFromTxRef(`hv_not-a-uuid_123`)).toBeNull();
    expect(bookingIdFromTxRef(null)).toBeNull();
  });
});

describe("webhookEventKey", () => {
  it("identifies an event by type, record and state", () => {
    expect(webhookEventKey("charge.completed", 285959875, "successful")).toBe("charge.completed:285959875:successful");
    expect(webhookEventKey("transfer.completed", "51", "SUCCESSFUL")).toBe("transfer.completed:51:successful");
  });

  it("treats a new state of the same record as a new event", () => {
    expect(webhookEventKey("transfer.completed", 51, "FAILED")).not.toBe(webhookEventKey("transfer.completed", 51, "SUCCESSFUL"));
  });

  it("is null without an id", () => {
    expect(webhookEventKey("charge.completed", undefined, "successful")).toBeNull();
    expect(webhookEventKey("charge.completed", "", "successful")).toBeNull();
  });
});

describe("transferOutcome", () => {
  it("maps Flutterwave transfer statuses", () => {
    expect(transferOutcome("SUCCESSFUL")).toBe("paid");
    expect(transferOutcome("FAILED")).toBe("failed");
    expect(transferOutcome("NEW")).toBe("pending");
    expect(transferOutcome("PENDING")).toBe("pending");
    expect(transferOutcome(undefined)).toBe("pending");
  });
});

describe("refundOutcome", () => {
  it("maps Flutterwave refund statuses", () => {
    expect(refundOutcome("completed")).toBe("processed");
    expect(refundOutcome("completed-bank-transfer")).toBe("processed");
    expect(refundOutcome("processing")).toBe("pending");
    expect(refundOutcome("pending-mpgs")).toBe("pending");
    expect(refundOutcome("failed")).toBe("failed");
  });
});
