import { describe, it, expect, afterEach } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";

import {
  createTestParent,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  makeAdmin,
} from "./helpers";
import { currentUser } from "./mocks";
import { signIn } from "@/lib/auth/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// signIn() runs against whatever client the mocked
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

// Found by cross-role QA: an admin's own sign-ins didn't appear in the audit
// log --
// only what end users did. An audit trail for privileged access that leaves
// out the privileged account's own sign-ins isn't much of one.
describe("admin sign-ins are audit-logged", () => {
  it("logs an admin sign-in", async () => {
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
  });

  it("does not log ordinary parent sign-ins (admin-only, to keep the log meaningful)", async () => {
    const parent = await createTestParent();

    startLoggedOut();
    const result = await signIn(parent.email, parent.password);
    expect(result.ok).toBe(true);

    expect(await auditRows(parent.userId, "auth.sign_in")).toHaveLength(0);
  });
});
