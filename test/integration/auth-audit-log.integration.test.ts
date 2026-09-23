import { describe, it, expect, afterEach } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";

import {
  createTestParent,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  makeAdmin,
  enrollAndVerifyMfa,
  generateTotp,
} from "./helpers";
import { currentUser } from "./mocks";
import { signIn } from "@/lib/auth/actions";
import { enrollMfa, confirmMfaEnrollment, unenrollMfa, verifyMfaLogin } from "@/lib/auth/mfa-actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// signIn()/verifyMfaLogin() run against whatever client the mocked
// createClient() hands back. A real login starts unauthenticated, so this
// points it at a fresh anon client (no session yet), same as a browser
// hitting the login form.
function startLoggedOut() {
  const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  currentUser.client = client as unknown as typeof currentUser.client;
}

async function auditRows(actorId: string, action: string) {
  const { data, error } = await admin
    .from("audit_log")
    .select("action, actor_role, entity_type, entity_id, metadata")
    .eq("actor_id", actorId)
    .eq("action", action);
  if (error) throw new Error(`audit_log read failed: ${error.message}`);
  return data ?? [];
}

// A TOTP code can't safely be reused inside the same 30s window it was first
// used in, so anything that needs a SECOND valid code for the same factor
// waits for the next window rather than depending on the auth server's
// replay/skew behavior.
async function waitForNextTotpWindow() {
  const step = 30_000;
  await new Promise((r) => setTimeout(r, step - (Date.now() % step) + 1500));
}

// Found by cross-role QA: none of an admin's own security-relevant actions
// (signing in, turning two-factor on or off) appeared in the audit log --
// only what end users did. An audit trail for privileged access that leaves
// out the privileged account's own sign-ins isn't much of one.
describe("admin sign-ins and two-factor changes are audit-logged", () => {
  it("logs an admin sign-in that has no second factor, flagged mfa:false", async () => {
    const adminUser = await createTestParent();
    await makeAdmin(adminUser.userId);

    startLoggedOut();
    const result = await signIn(adminUser.email, adminUser.password);
    expect(result.ok).toBe(true);

    const rows = await auditRows(adminUser.userId, "auth.sign_in");
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_role).toBe("admin");
    expect(rows[0].entity_type).toBe("user");
    expect(rows[0].entity_id).toBe(adminUser.userId);
    expect(rows[0].metadata).toEqual({ mfa: false });
  });

  it("logs an admin sign-in only once the second factor checks out, flagged mfa:true", async () => {
    const adminUser = await createTestParent();
    await makeAdmin(adminUser.userId);
    const enrolledClient = await signInAs(adminUser);
    const secret = await enrollAndVerifyMfa(enrolledClient);
    signOut();

    startLoggedOut();
    const first = await signIn(adminUser.email, adminUser.password);
    expect(first.ok && "mfaRequired" in first && first.mfaRequired).toBe(true);
    // Password alone isn't a completed admin sign-in.
    expect(await auditRows(adminUser.userId, "auth.sign_in")).toHaveLength(0);

    if (!first.ok || !("factorId" in first) || !first.factorId) throw new Error("expected an MFA challenge");
    await waitForNextTotpWindow();
    const second = await verifyMfaLogin(first.factorId, generateTotp(secret));
    expect(second.ok).toBe(true);

    const rows = await auditRows(adminUser.userId, "auth.sign_in");
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toEqual({ mfa: true });
  }, 90_000);

  it("logs turning two-factor on and off for any role, not just admins", async () => {
    const parent = await createTestParent();
    await signInAs(parent);

    const enrolled = await enrollMfa();
    if (!enrolled.ok) throw new Error(`enrollMfa failed: ${enrolled.error}`);
    const confirmed = await confirmMfaEnrollment(enrolled.factorId, generateTotp(enrolled.secret));
    expect(confirmed.ok).toBe(true);
    const on = await auditRows(parent.userId, "auth.mfa_enrolled");
    expect(on).toHaveLength(1);
    expect(on[0].actor_role).toBe("parent");
    expect(on[0].entity_id).toBe(parent.userId);

    await waitForNextTotpWindow();
    const off = await unenrollMfa(enrolled.factorId, generateTotp(enrolled.secret));
    expect(off.ok).toBe(true);
    expect(await auditRows(parent.userId, "auth.mfa_disabled")).toHaveLength(1);
  }, 90_000);

  it("does not log ordinary parent sign-ins (admin-only, to keep the log meaningful)", async () => {
    const parent = await createTestParent();

    startLoggedOut();
    const result = await signIn(parent.email, parent.password);
    expect(result.ok).toBe(true);

    expect(await auditRows(parent.userId, "auth.sign_in")).toHaveLength(0);
  });
});
