import { describe, expect, it } from "vitest";

import { splitEarning, COMMISSION_RATE } from "./commission";

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
