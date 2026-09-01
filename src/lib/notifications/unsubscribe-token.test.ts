import { describe, expect, it, beforeAll } from "vitest";

import { makeUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe-token";

beforeAll(() => {
  process.env.UNSUBSCRIBE_SECRET = "test-secret";
});

describe("unsubscribe token", () => {
  it("round-trips a user id", () => {
    const token = makeUnsubscribeToken("user-123");
    expect(verifyUnsubscribeToken(token)).toBe("user-123");
  });

  it("rejects a tampered signature", () => {
    const token = makeUnsubscribeToken("user-123");
    const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("rejects a token for a different user id", () => {
    const token = makeUnsubscribeToken("user-123");
    const sig = token.split(".")[1];
    expect(verifyUnsubscribeToken(`user-999.${sig}`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken(null)).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken("nodot")).toBeNull();
    expect(verifyUnsubscribeToken(".sigonly")).toBeNull();
  });

  it("handles a user id that contains dots", () => {
    const id = "auth0|abc.def.ghi";
    expect(verifyUnsubscribeToken(makeUnsubscribeToken(id))).toBe(id);
  });
});
