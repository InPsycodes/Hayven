import { describe, expect, it } from "vitest";

import { sessionPriceError } from "./pricing";

describe("sessionPriceError", () => {
  it("accepts prices in range, including both ends", () => {
    expect(sessionPriceError(5000)).toBeNull();
    expect(sessionPriceError(15000)).toBeNull();
    expect(sessionPriceError(150000)).toBeNull();
  });

  it("rejects prices outside the range or not a number", () => {
    expect(sessionPriceError(150)).not.toBeNull();
    expect(sessionPriceError(1500000)).not.toBeNull();
    expect(sessionPriceError(Number.NaN)).not.toBeNull();
    expect(sessionPriceError(0)).not.toBeNull();
  });
});
