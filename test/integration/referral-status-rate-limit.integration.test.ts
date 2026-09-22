import { describe, it, expect, afterEach } from "vitest";

import { testAdminClient, signOut, cleanupAll, trackForCleanup } from "./helpers";
import { listReferralsForReferrer } from "@/lib/referrals/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function createReferral(email: string, referenceCode: string) {
  const { data, error } = await admin
    .from("referrals")
    .insert({
      reference_code: referenceCode,
      referrer_contact: email,
      referrer_name: "Dr. Test Pediatrician",
      parent_contact: "parent@hayven.test",
      child_name: "Test Child",
      status: "received",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`referral fixture failed: ${error?.message}`);
  trackForCleanup("referrals", data.id);
}

// F1 regression (pre-launch audit, P1): the referral-status lookup's rate
// limit used to be keyed only on the guessed reference code
// (`referral-status:${code}`) -- a fresh guess landed in a fresh,
// never-seen bucket every time, so varying the code reset the throttle on
// every attempt and the ~28.6M-combination code space was never actually
// rate-limited against a fixed target email.
describe("F1 regression: referral-status lookup is throttled per targeted email, not just per guessed code", () => {
  it("blocks repeated wrong-code guesses against the SAME email even though every code is different", async () => {
    const email = `victim-${Date.now()}@hayven.test`;
    await createReferral(email, "HYV-REF-REAL1");

    let lastResult: Awaited<ReturnType<typeof listReferralsForReferrer>> | null = null;
    for (let i = 0; i < 12; i++) {
      lastResult = await listReferralsForReferrer(`HYV-REF-GUES${i}`, email);
    }

    expect(lastResult).not.toBeNull();
    expect(lastResult!.ok).toBe(false);
    if (!lastResult!.ok) {
      expect(lastResult!.error).toMatch(/too many attempts/i);
    }
  });

  it("still lets a legitimate lookup with the right code and email through", async () => {
    const email = `real-${Date.now()}@hayven.test`;
    await createReferral(email, "HYV-REF-GOOD1");

    const result = await listReferralsForReferrer("HYV-REF-GOOD1", email);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].referenceCode).toBe("HYV-REF-GOOD1");
    }
  });
});
