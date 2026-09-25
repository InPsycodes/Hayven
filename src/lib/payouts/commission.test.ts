import { describe, expect, it } from "vitest";

import {
  splitEarning,
  earningSourcesReversedByRefund,
  COMMISSION_RATE,
  EARNING_HOLD_MS,
  DISPUTE_WINDOW_MS,
} from "./commission";

describe("splitEarning", () => {
  it("takes 20% commission, rest to the therapist", () => {
    expect(splitEarning(20000)).toEqual({ gross: 20000, commission: 4000, net: 16000 });
  });
  it("rounds commission and keeps gross = commission + net", () => {
    const s = splitEarning(12345);
    expect(s.commission).toBe(Math.round(12345 * COMMISSION_RATE));
    expect(s.commission + s.net).toBe(s.gross);
  });
  it("clamps a negative/zero gross", () => {
    expect(splitEarning(-100)).toEqual({ gross: 0, commission: 0, net: 0 });
    expect(splitEarning(0)).toEqual({ gross: 0, commission: 0, net: 0 });
  });
});

describe("EARNING_HOLD_MS / DISPUTE_WINDOW_MS", () => {
  // E1 from the external PRD review: a payout run must never be able to
  // claim an earning before the dispute window on that same session has
  // closed -- otherwise money can leave before a dispute describing it
  // could even exist yet. This is the one invariant that guarantees it,
  // independent of whatever the two constants' actual values are; it fails
  // loudly if a future change to either one reopens the gap.
  it("the earning hold strictly outlasts the dispute window", () => {
    expect(EARNING_HOLD_MS).toBeGreaterThan(DISPUTE_WINDOW_MS);
  });
});

describe("earningSourcesReversedByRefund", () => {
  it("reverses nothing for a duplicate charge", () => {
    expect(earningSourcesReversedByRefund({ isDuplicateCharge: true, bookingStatus: "confirmed" })).toEqual([]);
    expect(earningSourcesReversedByRefund({ isDuplicateCharge: true, bookingStatus: "completed" })).toEqual([]);
  });
  it("keeps the therapist's retained share on a cancellation refund", () => {
    expect(earningSourcesReversedByRefund({ isDuplicateCharge: false, bookingStatus: "cancelled" })).toEqual(["session"]);
  });
  it("reverses every earning when a delivered or no-show session is refunded", () => {
    expect(earningSourcesReversedByRefund({ isDuplicateCharge: false, bookingStatus: "completed" })).toEqual([
      "session",
      "retained_cancellation",
    ]);
    expect(earningSourcesReversedByRefund({ isDuplicateCharge: false, bookingStatus: "no_show" })).toEqual([
      "session",
      "retained_cancellation",
    ]);
  });
});
