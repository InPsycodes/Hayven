import { describe, expect, it } from "vitest";

import { computeRefund, gatewayFeeNaira } from "./refund-policy";

const HOUR = 60 * 60 * 1000;
const NOW = 1_000_000_000_000;

describe("gatewayFeeNaira", () => {
  it("is 2% plus 7.5% VAT on the fee", () => {
    expect(gatewayFeeNaira(15000)).toBe(323); // 300 + 22.50 VAT
    expect(gatewayFeeNaira(2000)).toBe(43);
  });
  it("has no cap", () => {
    expect(gatewayFeeNaira(1_000_000)).toBe(21500);
  });
  it("is 0 for a non-positive amount", () => {
    expect(gatewayFeeNaira(0)).toBe(0);
  });
});

describe("computeRefund — parent-initiated", () => {
  const base = { amountPaidNaira: 20000, nowMs: NOW, initiatedBy: "parent" as const };

  it("full refund minus fee, 24h+ before", () => {
    const o = computeRefund({ ...base, slotStartMs: NOW + 25 * HOUR });
    expect(o.tier).toBe("full");
    expect(o.feeNaira).toBe(gatewayFeeNaira(20000));
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
