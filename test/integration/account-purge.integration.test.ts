import { createClient as createAnonClient } from "@supabase/supabase-js";
import { describe, it, expect, afterEach } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  makeAdmin,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
  type TestParent,
} from "./helpers";
import { purgeAccountPersonalData } from "@/lib/account/purge";
import { purgeReviewedAccountDeletions } from "@/lib/account/cron";
import { reviewAccountDeletionRequest } from "@/lib/admin/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function makeTestAdmin(): Promise<TestParent> {
  const admin_ = await createTestParent();
  await makeAdmin(admin_.userId);
  return admin_;
}

async function insertDeletionRequest(userId: string): Promise<string> {
  const { data, error } = await admin
    .from("account_deletion_requests")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insertDeletionRequest failed: ${error?.message}`);
  trackForCleanup("account_deletion_requests", data.id);
  return data.id;
}

// E3 regression: Privacy Policy Section 6 (/privacy) promises personal
// account data is deleted within 30 days of a verified deletion request --
// account_deletion_requests used to be a tracking-only queue with nothing
// behind it. This is the actual purge mechanism.
describe("E3 regression: account personal-data purge", () => {
  it("fully anonymizes a parent and blocks future sign-in, without touching their child's record", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const adminUser = await makeTestAdmin();

    await purgeAccountPersonalData(parent.userId, { adminId: adminUser.userId, requestId: "test" });

    const { data: user } = await admin.from("users").select("full_name, email, phone, status").eq("id", parent.userId).single();
    expect(user?.full_name).toBe("Deleted user");
    expect(user?.email).toContain("@deleted.hayven.invalid");
    expect(user?.phone).toBeNull();
    expect(user?.status).toBe("suspended");

    // The clinical record must survive completely untouched.
    const { data: childRow } = await admin.from("children").select("first_name").eq("id", child.id).single();
    expect(childRow?.first_name).toBeTruthy();

    // Soft-deleted: signing in with the original credentials must now fail.
    const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: parent.email,
      password: parent.password,
    });
    expect(signInError).toBeTruthy();
  });

  it("preserves a therapist's name (clinical attribution) but scrubs their contact info", async () => {
    const therapist = await createTestTherapist();
    const adminUser = await makeTestAdmin();

    const { data: before } = await admin
      .from("users")
      .select("full_name")
      .eq("id", therapist.userId)
      .single();

    await purgeAccountPersonalData(therapist.userId, { adminId: adminUser.userId, requestId: "test" });

    const { data: after } = await admin
      .from("users")
      .select("full_name, email, phone")
      .eq("id", therapist.userId)
      .single();
    expect(after?.full_name).toBe(before?.full_name);
    expect(after?.email).toContain("@deleted.hayven.invalid");
    expect(after?.phone).toBeNull();

    // therapist_profiles (the public listing) is untouched by this pass.
    const { data: profile } = await admin
      .from("therapist_profiles")
      .select("id")
      .eq("id", therapist.therapistProfileId)
      .maybeSingle();
    expect(profile).toBeTruthy();
  });

  it("is idempotent -- calling it twice doesn't error or re-purge", async () => {
    const parent = await createTestParent();
    const adminUser = await makeTestAdmin();

    await purgeAccountPersonalData(parent.userId, { adminId: adminUser.userId, requestId: "test" });
    const { data: firstPass } = await admin.from("users").select("email").eq("id", parent.userId).single();

    await expect(
      purgeAccountPersonalData(parent.userId, { adminId: adminUser.userId, requestId: "test" })
    ).resolves.not.toThrow();

    const { data: secondPass } = await admin.from("users").select("email").eq("id", parent.userId).single();
    expect(secondPass?.email).toBe(firstPass?.email);
  });

  it("reviewAccountDeletionRequest('actioned') purges immediately and records the decision", async () => {
    const parent = await createTestParent();
    const adminUser = await makeTestAdmin();
    const requestId = await insertDeletionRequest(parent.userId);

    await signInAs(adminUser);
    const result = await reviewAccountDeletionRequest(requestId, "actioned");
    expect(result.ok).toBe(true);

    const { data: user } = await admin.from("users").select("full_name").eq("id", parent.userId).single();
    expect(user?.full_name).toBe("Deleted user");

    const { data: request } = await admin
      .from("account_deletion_requests")
      .select("status")
      .eq("id", requestId)
      .single();
    expect(request?.status).toBe("actioned");
  });

  it("purgeReviewedAccountDeletions only purges requests reviewed 30+ days ago", async () => {
    const staleParent = await createTestParent();
    const recentParent = await createTestParent();
    const adminUser = await makeTestAdmin();

    const staleRequestId = await insertDeletionRequest(staleParent.userId);
    const recentRequestId = await insertDeletionRequest(recentParent.userId);

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from("account_deletion_requests")
      .update({ status: "reviewed", admin_id: adminUser.userId, reviewed_at: thirtyOneDaysAgo })
      .eq("id", staleRequestId);
    await admin
      .from("account_deletion_requests")
      .update({ status: "reviewed", admin_id: adminUser.userId, reviewed_at: oneDayAgo })
      .eq("id", recentRequestId);

    const result = await purgeReviewedAccountDeletions();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const { data: staleUser } = await admin.from("users").select("full_name").eq("id", staleParent.userId).single();
    expect(staleUser?.full_name).toBe("Deleted user");
    const { data: staleRequest } = await admin
      .from("account_deletion_requests")
      .select("status")
      .eq("id", staleRequestId)
      .single();
    expect(staleRequest?.status).toBe("actioned");

    // Reviewed only yesterday -- must not be touched yet.
    const { data: recentUser } = await admin.from("users").select("full_name").eq("id", recentParent.userId).single();
    expect(recentUser?.full_name).not.toBe("Deleted user");
    const { data: recentRequest } = await admin
      .from("account_deletion_requests")
      .select("status")
      .eq("id", recentRequestId)
      .single();
    expect(recentRequest?.status).toBe("reviewed");
  });
});
