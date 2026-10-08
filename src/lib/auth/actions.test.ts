import { describe, it, expect } from "vitest";

import { signUp } from "./actions";

/**
 * AUD-07 (external audit, 2026-10-08): signup had no server-side password
 * length check at all -- only a client-side one, trivially bypassed by
 * calling this action directly. Confirms the new guard actually rejects a
 * short password, and does so before any network call (no Supabase/rate
 * limit mocking needed -- the guard is the first thing that can fail).
 */
describe("signUp password length", () => {
  it("rejects a password under 8 characters without reaching the network", async () => {
    const result = await signUp({
      role: "parent",
      fullName: "Test User",
      email: "test@example.com",
      phone: "+2348000000000",
      password: "short1",
      agreedToTerms: true,
    });
    expect(result).toEqual({ ok: false, error: "Use at least 8 characters." });
  });

  it("does not reject an 8-character password at this guard (fails later, on the network call, which this unit test doesn't reach)", async () => {
    const result = await signUp({
      role: "parent",
      fullName: "Test User",
      email: "test@example.com",
      phone: "+2348000000000",
      password: "exactly8",
      agreedToTerms: true,
    });
    // Must NOT be the length-guard's error -- whatever it is (a network
    // error, since no real Supabase project is reachable in this unit
    // test), it proves the 8-char password passed the guard.
    expect(result).not.toEqual({ ok: false, error: "Use at least 8 characters." });
  });

  it("still rejects an unapproved role before the length check -- guard ordering unchanged", async () => {
    const result = await signUp({
      role: "admin" as never,
      fullName: "Test User",
      email: "test@example.com",
      phone: "+2348000000000",
      password: "short1",
      agreedToTerms: true,
    });
    expect(result).toEqual({ ok: false, error: "Invalid account type." });
  });
});
