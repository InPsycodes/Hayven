import { describe, it, expect, afterEach } from "vitest";
import { createClient as createAnonClient } from "@supabase/supabase-js";

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

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

function anonClient() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

/**
 * E7 from the external PRD review: three real privilege-escalation paths
 * (0029, 0049, 0062/0063) were found and fixed after the fact, plus two
 * more found in this same review pass (0084/0085's bank-column leak, E6's
 * decorative consent revocation). None of them had a regression test, so
 * the next policy change could silently reopen any of them. This suite
 * locks each one in.
 */

describe("0029 regression: signup can't self-provision an elevated role", () => {
  it("handle_new_user() ignores a role: admin claim in auth metadata and lands as parent", async () => {
    // Exercises the actual fixed code path (the handle_new_user() trigger,
    // which reads raw_user_meta_data regardless of which API populated it)
    // via admin.createUser() rather than the public signUp() endpoint --
    // this project's Auth config applies email-format validation on public
    // signUp() (rejects both .test and example.com addresses here) that the
    // admin API doesn't, which is orthogonal to the thing 0029 actually
    // fixed. The trigger doesn't and shouldn't trust raw_user_meta_data's
    // role field no matter how the auth.users row was created.
    const email = `integration-test+role-escalation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@hayven.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "IntegrationTest!2026",
      email_confirm: true,
      user_metadata: { role: "admin", full_name: "Attempted Admin" },
    });
    expect(error).toBeNull();
    expect(data.user).toBeTruthy();

    const { data: row } = await admin.from("users").select("role").eq("id", data.user!.id).single();
    expect(row?.role).toBe("parent");

    await admin.from("users").delete().eq("id", data.user!.id);
    await admin.auth.admin.deleteUser(data.user!.id);
  });
});

describe("0049 regression: a user can't self-promote via a profile update", () => {
  it("updating own role through the authenticated client has no effect", async () => {
    const parent = await createTestParent();
    const client = await signInAs(parent);

    await client.from("users").update({ role: "admin" }).eq("id", parent.userId);

    const { data: row } = await admin.from("users").select("role").eq("id", parent.userId).single();
    expect(row?.role).toBe("parent");
  });
});

describe("0062/0063 regression: a parent can't assign an unbooked therapist to their child", () => {
  it("inserting a therapist_child_assignments row with no matching booking fails", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const client = await signInAs(parent);

    const { error } = await client.from("therapist_child_assignments").insert({
      child_id: child.id,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });
    expect(error).toBeTruthy();

    const { data: row } = await admin
      .from("therapist_child_assignments")
      .select("id")
      .eq("child_id", child.id)
      .eq("therapist_id", therapist.therapistProfileId)
      .maybeSingle();
    expect(row).toBeNull();
  });
});

describe("0084/0085 regression: bank columns aren't selectable via the regular client", () => {
  it("a therapist can't read their own bank_account_number via the authenticated client directly", async () => {
    const therapist = await createTestTherapist();
    const client = await signInAs(therapist);

    const { error } = await client
      .from("therapist_profiles")
      .select("bank_account_number")
      .eq("id", therapist.therapistProfileId)
      .maybeSingle();
    expect(error).toBeTruthy();
    expect(error?.code).toBe("42501");
  });

  it("an unauthenticated client can't read any therapist's bank_account_number", async () => {
    const therapist = await createTestTherapist();
    const anon = anonClient();

    const { error } = await anon
      .from("therapist_profiles")
      .select("bank_account_number")
      .eq("id", therapist.therapistProfileId)
      .maybeSingle();
    expect(error).toBeTruthy();
    expect(error?.code).toBe("42501");
  });

  it("public discovery columns (bio, location, verification_status) are still readable", async () => {
    const therapist = await createTestTherapist();
    const anon = anonClient();

    const { error, data } = await anon
      .from("therapist_profiles")
      .select("id, bio, location, verification_status")
      .eq("id", therapist.therapistProfileId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(therapist.therapistProfileId);
  });
});

describe("E6 regression: revoking therapist_access consent blocks clinical reads", () => {
  it("a therapist can read a goal before revocation and not after", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();

    const { error: assignErr } = await admin.from("therapist_child_assignments").insert({
      child_id: child.id,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });
    expect(assignErr).toBeNull();
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    const { data: goal, error: goalErr } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, title: "Test goal" })
      .select("id")
      .single();
    expect(goalErr).toBeNull();
    trackForCleanup("goals", goal!.id);

    const therapistClient = await signInAs(therapist);
    const before = await therapistClient.from("goals").select("id").eq("id", goal!.id).maybeSingle();
    expect(before.data?.id).toBe(goal!.id);

    const { error: consentErr } = await admin.from("intake_consents").insert({
      child_id: child.id,
      consent_type: "therapist_access",
      granted: false,
      recorded_by: parent.userId,
    });
    expect(consentErr).toBeNull();
    trackForCleanup("intake_consents", child.id, "child_id");

    const after = await therapistClient.from("goals").select("id").eq("id", goal!.id).maybeSingle();
    expect(after.data).toBeNull();
  });

  it("a child with no consent decision at all keeps working (default allow)", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert({
      child_id: child.id,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    const { data: goal } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, title: "Test goal" })
      .select("id")
      .single();
    trackForCleanup("goals", goal!.id);

    const therapistClient = await signInAs(therapist);
    const result = await therapistClient.from("goals").select("id").eq("id", goal!.id).maybeSingle();
    expect(result.data?.id).toBe(goal!.id);
  });
});
