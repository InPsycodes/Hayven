import { describe, it, expect, afterEach } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
} from "./helpers";
import { setUserAccountStatus } from "@/lib/admin/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function createActiveAssignment(therapistProfileId: string, childId: string) {
  const { data, error } = await admin
    .from("therapist_child_assignments")
    .insert({ therapist_id: therapistProfileId, child_id: childId, status: "active" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`assignment fixture failed: ${error?.message}`);
  trackForCleanup("therapist_child_assignments", data.id);
  return data.id;
}

async function makeTestAdmin() {
  const adminUser = await createTestParent();
  await admin.from("users").update({ role: "admin" }).eq("id", adminUser.userId);
  return adminUser;
}

// AUTH-01 regression (pre-launch audit, P0): suspending an account is
// Hayven's only incident-containment mechanism, but it only ever revoked
// access at the Next.js app layer (getSession()) -- RLS itself never
// checked users.status, so a suspended account's already-issued Supabase
// Auth token kept full database access via a direct API call, bypassing
// getSession() entirely. Live-reproduced against a real account during the
// audit before migration 0095 fixed it.
describe("AUTH-01 regression: suspension actually revokes RLS access", () => {
  it("a suspended therapist's pre-suspension token can no longer read an assigned child", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    await createActiveAssignment(therapist.therapistProfileId, child.id);
    const adminUser = await makeTestAdmin();

    // Sign in BEFORE suspension -- this token is what the exploit reused.
    const therapistClient = await signInAs(therapist);
    const before = await therapistClient.from("children").select("id, first_name").eq("id", child.id).maybeSingle();
    expect(before.error).toBeNull();
    expect(before.data?.id).toBe(child.id);

    await signInAs(adminUser);
    const result = await setUserAccountStatus(therapist.userId, "suspended");
    expect(result.ok).toBe(true);

    // Same client, same never-refreshed token -- no re-login.
    const after = await therapistClient.from("children").select("id, first_name").eq("id", child.id).maybeSingle();
    expect(after.data).toBeNull();

    const goalsAfter = await therapistClient.from("goals").select("id").eq("child_id", child.id);
    expect(goalsAfter.data ?? []).toHaveLength(0);
  });

  it("a suspended parent's pre-suspension token can no longer read their own child", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const adminUser = await makeTestAdmin();

    const parentClient = await signInAs(parent);
    const before = await parentClient.from("children").select("id").eq("id", child.id).maybeSingle();
    expect(before.data?.id).toBe(child.id);

    await signInAs(adminUser);
    await setUserAccountStatus(parent.userId, "suspended");

    const after = await parentClient.from("children").select("id").eq("id", child.id).maybeSingle();
    expect(after.data).toBeNull();
  });

  it("reactivating restores access, and a suspended account can't sign in again", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const adminUser = await makeTestAdmin();

    await signInAs(adminUser);
    await setUserAccountStatus(parent.userId, "suspended");

    // ban_duration should now block a fresh sign-in too, not just RLS.
    const { createClient } = await import("@supabase/supabase-js");
    const freshClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const signInResult = await freshClient.auth.signInWithPassword({ email: parent.email, password: parent.password });
    expect(signInResult.error).not.toBeNull();

    const reactivate = await setUserAccountStatus(parent.userId, "active");
    expect(reactivate.ok).toBe(true);

    const parentClient = await signInAs(parent);
    const after = await parentClient.from("children").select("id").eq("id", child.id).maybeSingle();
    expect(after.data?.id).toBe(child.id);
  });
});
