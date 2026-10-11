import { describe, expect, it } from "vitest";

import { splitEarning, splitEarningAt, resolveCommissionRate, COMMISSION_RATE, EARNING_HOLD_MS, DISPUTE_WINDOW_MS } from "./commission";

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

describe("resolveCommissionRate", () => {
  const clinic = { commissionRate: 0.1, pilotRate: 0, pilotEndsOn: "2027-01-31" };

  it("uses the standard rate for an independent therapist", () => {
    expect(resolveCommissionRate({ override: null, clinic: null, sessionDate: "2026-11-01" })).toBe(0.2);
  });

  it("uses the pilot rate up to and including the last pilot day, then the clinic rate", () => {
    expect(resolveCommissionRate({ override: null, clinic, sessionDate: "2027-01-31" })).toBe(0);
    expect(resolveCommissionRate({ override: null, clinic, sessionDate: "2027-02-01" })).toBe(0.1);
  });

  it("uses the clinic rate when there is no pilot", () => {
    expect(resolveCommissionRate({ override: null, clinic: { ...clinic, pilotEndsOn: null }, sessionDate: "2026-11-01" })).toBe(0.1);
  });

  it("lets a therapist's own rate win", () => {
    expect(resolveCommissionRate({ override: 0.15, clinic, sessionDate: "2026-11-01" })).toBe(0.15);
  });
});

describe("splitEarningAt", () => {
  it("splits at the given rate", () => {
    expect(splitEarningAt(15000, 0.1)).toEqual({ gross: 15000, commission: 1500, net: 13500 });
    expect(splitEarningAt(15000, 0)).toEqual({ gross: 15000, commission: 0, net: 15000 });
  });
});
