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
import { getBankDetails } from "@/lib/payouts/queries";
import { getOnboardingStatus } from "@/lib/therapist/onboarding";
import { getCareTeamForChild } from "@/lib/therapy-sessions/queries";
import { getFullChildProgramme } from "@/lib/programme/queries";
import { getConfidentialNote } from "@/lib/therapy-sessions/confidential";

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

  // The lockdown moved the two legitimate self-reads onto the service-role
  // client with an app-level ownership check (src/lib/payouts/queries.ts,
  // src/lib/therapist/onboarding.ts) -- confirming the columns are locked
  // down doesn't by itself confirm the owner can still see their own data,
  // or that a *different* signed-in therapist can't reach it through those
  // same functions by just passing someone else's id.
  it("the owning therapist can still see their own bank details through getBankDetails/getOnboardingStatus", async () => {
    // createTestTherapist already sets bank_code/bank_account_number/
    // bank_account_name via an admin insert during setup.
    const therapist = await createTestTherapist();
    await signInAs(therapist);

    const details = await getBankDetails(therapist.therapistProfileId);
    expect(details).not.toBeNull();
    expect(details?.accountNumberMasked).toBe("••••0000");
    expect(details?.bankCode).toBe("058");

    const onboarding = await getOnboardingStatus(therapist.therapistProfileId);
    expect(onboarding.hasBankAccount).toBe(true);
  });

  it("a different signed-in therapist cannot read someone else's bank details through getBankDetails", async () => {
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();
    await signInAs(therapistB);

    const details = await getBankDetails(therapistA.therapistProfileId);
    expect(details).toBeNull();

    const onboarding = await getOnboardingStatus(therapistA.therapistProfileId);
    expect(onboarding.hasBankAccount).toBe(false);
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

describe("0083 regression: care-team roster visibility", () => {
  it("two therapists sharing a child can each see the other on the roster", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();

    const { error: insertErr } = await admin.from("therapist_child_assignments").insert([
      { child_id: child.id, therapist_id: therapistA.therapistProfileId, status: "active", therapy_type: "Speech" },
      { child_id: child.id, therapist_id: therapistB.therapistProfileId, status: "active", therapy_type: "OT" },
    ]);
    expect(insertErr).toBeNull();
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    await signInAs(therapistA);
    const rosterForA = await getCareTeamForChild(child.id, therapistA.therapistProfileId);
    expect(rosterForA).toHaveLength(1);
    expect(rosterForA[0].therapistId).toBe(therapistB.therapistProfileId);
    expect(rosterForA[0].therapyType).toBe("OT");

    signOut();
    await signInAs(therapistB);
    const rosterForB = await getCareTeamForChild(child.id, therapistB.therapistProfileId);
    expect(rosterForB).toHaveLength(1);
    expect(rosterForB[0].therapistId).toBe(therapistA.therapistProfileId);
  });

  it("a therapist not assigned to the child sees an empty roster", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const outsider = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert({
      child_id: child.id,
      therapist_id: therapistA.therapistProfileId,
      status: "active",
    });
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    await signInAs(outsider);
    const roster = await getCareTeamForChild(child.id, outsider.therapistProfileId);
    expect(roster).toHaveLength(0);
  });
});

describe("goal attribution regression: getFullChildProgramme resolves a teammate's name", () => {
  it("with two active therapists on the same child, each can see the other's name on their goal", async () => {
    // Reproduces the exact shape that broke .maybeSingle() in the first
    // version of this fix: TWO active assignment rows for one child.
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert([
      { child_id: child.id, therapist_id: therapistA.therapistProfileId, status: "active" },
      { child_id: child.id, therapist_id: therapistB.therapistProfileId, status: "active" },
    ]);
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    const { data: goalB } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapistB.therapistProfileId, title: "Therapist B's goal" })
      .select("id")
      .single();
    trackForCleanup("goals", goalB!.id);

    await signInAs(therapistA);
    const programme = await getFullChildProgramme(child.id);
    const seenGoal = programme.goals.find((g) => g.id === goalB!.id);
    expect(seenGoal).toBeTruthy();
    expect(seenGoal?.therapistId).toBe(therapistB.therapistProfileId);
    expect(seenGoal?.therapistName).toBeTruthy();
    expect(seenGoal?.therapistName).not.toBeNull();
  });

  it("an outsider therapist gets no goals and no attribution for a child they're not assigned to", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const outsider = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert({
      child_id: child.id,
      therapist_id: therapistA.therapistProfileId,
      status: "active",
    });
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    const { data: goal } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapistA.therapistProfileId, title: "Therapist A's goal" })
      .select("id")
      .single();
    trackForCleanup("goals", goal!.id);

    await signInAs(outsider);
    const programme = await getFullChildProgramme(child.id);
    expect(programme.goals).toHaveLength(0);
  });
});

describe("consent-consistency regression: revoking access blocks the admin-client read paths too", () => {
  // getConfidentialNote, getCareTeamForChild, and getFullChildProgramme's
  // goal-attribution query all independently re-implemented "is this
  // therapist actively assigned" before this fix, and none of them
  // re-checked consent when 0086 added that requirement to the RLS-backed
  // path -- a therapist whose access had been explicitly revoked could
  // still read the confidential note, the care-team roster, and attributed
  // goals through these three admin-client paths. All three now go through
  // the same isTherapistAuthorizedForChild helper; these tests set up one
  // shared scenario (assigned, then explicitly revoked) and check each.

  it("getConfidentialNote returns the note before revocation, null after", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert({
      child_id: child.id,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    const { data: session_ } = await admin
      .from("therapy_sessions")
      .insert({
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        confidential_note: "Flagged: watch for a specific antecedent pattern.",
      })
      .select("id")
      .single();
    trackForCleanup("therapy_sessions", session_!.id);

    const before = await getConfidentialNote(session_!.id, therapist.therapistProfileId);
    expect(before).toBe("Flagged: watch for a specific antecedent pattern.");

    await admin.from("intake_consents").insert({
      child_id: child.id,
      consent_type: "therapist_access",
      granted: false,
      recorded_by: parent.userId,
    });
    trackForCleanup("intake_consents", child.id, "child_id");

    const after = await getConfidentialNote(session_!.id, therapist.therapistProfileId);
    expect(after).toBeNull();
  });

  it("getCareTeamForChild returns the roster before revocation, empty after", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert([
      { child_id: child.id, therapist_id: therapistA.therapistProfileId, status: "active" },
      { child_id: child.id, therapist_id: therapistB.therapistProfileId, status: "active" },
    ]);
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    await signInAs(therapistA);
    const before = await getCareTeamForChild(child.id, therapistA.therapistProfileId);
    expect(before).toHaveLength(1);

    await admin.from("intake_consents").insert({
      child_id: child.id,
      consent_type: "therapist_access",
      granted: false,
      recorded_by: parent.userId,
    });
    trackForCleanup("intake_consents", child.id, "child_id");

    const after = await getCareTeamForChild(child.id, therapistA.therapistProfileId);
    expect(after).toHaveLength(0);
  });

  it("getFullChildProgramme stops attributing goals to a therapist once their access is revoked", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();

    await admin.from("therapist_child_assignments").insert([
      { child_id: child.id, therapist_id: therapistA.therapistProfileId, status: "active" },
      { child_id: child.id, therapist_id: therapistB.therapistProfileId, status: "active" },
    ]);
    trackForCleanup("therapist_child_assignments", child.id, "child_id");

    const { data: goalB } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapistB.therapistProfileId, title: "Therapist B's goal" })
      .select("id")
      .single();
    trackForCleanup("goals", goalB!.id);

    await signInAs(therapistA);
    const before = await getFullChildProgramme(child.id);
    expect(before.goals.find((g) => g.id === goalB!.id)?.therapistName).toBeTruthy();

    await admin.from("intake_consents").insert({
      child_id: child.id,
      consent_type: "therapist_access",
      granted: false,
      recorded_by: parent.userId,
    });
    trackForCleanup("intake_consents", child.id, "child_id");

    // therapistA's OWN access is what's revoked -- RLS blocks their read of
    // the goals table entirely now, same as any other unauthorized
    // therapist, so the whole list comes back empty rather than just
    // missing the attribution.
    const after = await getFullChildProgramme(child.id);
    expect(after.goals).toHaveLength(0);
  });
});
