import { describe, expect, it } from "vitest";

import { computeRefund, paystackFeeNaira } from "./refund-policy";

const HOUR = 60 * 60 * 1000;
const NOW = 1_000_000_000_000;

describe("paystackFeeNaira", () => {
  it("is 1.5% under ₦2,500 (no flat fee)", () => {
    expect(paystackFeeNaira(2000)).toBe(30);
  });
  it("adds ₦100 at ₦2,500 and above", () => {
    expect(paystackFeeNaira(10000)).toBe(250); // 150 + 100
  });
  it("caps at ₦2,000", () => {
    expect(paystackFeeNaira(1_000_000)).toBe(2000);
  });
  it("is 0 for a non-positive amount", () => {
    expect(paystackFeeNaira(0)).toBe(0);
  });
});

describe("computeRefund — parent-initiated", () => {
  const base = { amountPaidNaira: 20000, nowMs: NOW, initiatedBy: "parent" as const };

  it("full refund minus fee, 24h+ before", () => {
    const o = computeRefund({ ...base, slotStartMs: NOW + 25 * HOUR });
    expect(o.tier).toBe("full");
    expect(o.feeNaira).toBe(paystackFeeNaira(20000));
    expect(o.refundNaira).toBe(20000 - o.feeNaira);
    expect(o.refundNaira + o.withheldNaira).toBe(20000);
  });

  it("half minus fee, under 24h", () => {
    const o = computeRefund({ ...base, slotStartMs: NOW + 5 * HOUR });
    expect(o.tier).toBe("partial");
    expect(o.refundNaira).toBe(10000 - o.feeNaira);
  });

  it("exactly 24h out counts as the free window", () => {
    const o = computeRefund({ ...base, slotStartMs: NOW + 24 * HOUR });
    expect(o.tier).toBe("full");
  });

  it("nothing once the session has started", () => {
    const o = computeRefund({ ...base, slotStartMs: NOW - HOUR });
    expect(o).toMatchObject({ tier: "none", refundNaira: 0, feeNaira: 0 });
  });
});

describe("computeRefund — therapist-initiated", () => {
  it("always full, Hayven eats the fee", () => {
    const o = computeRefund({
      amountPaidNaira: 20000,
      slotStartMs: NOW + 2 * HOUR, // even last-minute
      nowMs: NOW,
      initiatedBy: "therapist",
    });
    expect(o).toMatchObject({ tier: "full", refundNaira: 20000, withheldNaira: 0, feeNaira: 0 });
  });
});

it("unpaid booking -> nothing owed", () => {
  const o = computeRefund({ amountPaidNaira: 0, slotStartMs: NOW + 48 * HOUR, nowMs: NOW, initiatedBy: "parent" });
  expect(o).toMatchObject({ tier: "none", refundNaira: 0 });
});
