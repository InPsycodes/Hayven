import { createClient as createAnonClient } from "@supabase/supabase-js";
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
  enrollAndVerifyMfa,
} from "./helpers";
import { expireInactiveAssignments } from "@/lib/assignments/cron";
import { endTherapistChildAssignment, renewTherapistChildAssignment } from "@/lib/admin/actions";

const admin = testAdminClient;
const HUNDRED_DAYS_AGO = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const TEN_DAYS_AGO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function createAssignment(therapistProfileId: string, childId: string, startedOn: string) {
  const { data, error } = await admin
    .from("therapist_child_assignments")
    .insert({ therapist_id: therapistProfileId, child_id: childId, started_on: startedOn })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createAssignment failed: ${error?.message}`);
  trackForCleanup("therapist_child_assignments", data.id);
  return data.id;
}

/** A real, RLS-bound sign-in as the therapist -- separate from signInAs
 *  (which only swaps the mocked createClient() server actions use), so
 *  these tests can prove what is_assigned_therapist() actually allows,
 *  not what the admin client can see. */
async function signInAsTherapistRls(therapist: { email: string; password: string }) {
  const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email: therapist.email, password: therapist.password });
  if (error) throw new Error(`signInAsTherapistRls failed: ${error.message}`);
  return client;
}

async function makeTestAdmin() {
  const adminUser = await createTestParent();
  await admin.from("users").update({ role: "admin" }).eq("id", adminUser.userId);
  return adminUser;
}

// E5 regression: a therapist_child_assignment with no recorded clinical
// session or documented activity for 90 days auto-expires, cutting off
// access immediately -- previously nothing ever lapsed it automatically.
describe("E5 regression: inactive assignment auto-expiry", () => {
  it("expires an assignment with no activity in 90+ days and immediately cuts off RLS access", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const assignmentId = await createAssignment(therapist.therapistProfileId, child.id, HUNDRED_DAYS_AGO);

    const { data: goal } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, title: "Pre-expiry goal" })
      .select("id")
      .single();
    trackForCleanup("goals", goal!.id); // goals.therapist_id has no cascade -- untracked rows block cleanup's therapist delete

    const rlsClient = await signInAsTherapistRls(therapist);
    const { data: before } = await rlsClient.from("goals").select("id").eq("id", goal!.id).maybeSingle();
    expect(before).toBeTruthy();

    const result = await expireInactiveAssignments();
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("status, ended_reason, ended_on")
      .eq("id", assignmentId)
      .single();
    expect(assignment?.status).toBe("expired");
    expect(assignment?.ended_reason).toBe("inactivity");
    expect(assignment?.ended_on).toBeTruthy();

    const { data: after } = await rlsClient.from("goals").select("id").eq("id", goal!.id).maybeSingle();
    expect(after).toBeNull();
  });

  it("does not expire an assignment with a recent therapy_sessions entry", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const assignmentId = await createAssignment(therapist.therapistProfileId, child.id, HUNDRED_DAYS_AGO);

    const { data: session } = await admin
      .from("therapy_sessions")
      .insert({
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        session_date: TEN_DAYS_AGO.toISOString().slice(0, 10),
        status: "complete",
      })
      .select("id")
      .single();
    trackForCleanup("therapy_sessions", session!.id); // therapy_sessions.therapist_id has no cascade

    await expireInactiveAssignments();

    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("status")
      .eq("id", assignmentId)
      .single();
    expect(assignment?.status).toBe("active");
  });

  it("does not expire a recently-started assignment with no activity yet", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const today = new Date().toISOString().slice(0, 10);
    const assignmentId = await createAssignment(therapist.therapistProfileId, child.id, today);

    await expireInactiveAssignments();

    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("status")
      .eq("id", assignmentId)
      .single();
    expect(assignment?.status).toBe("active");
  });

  it("leaves a manually-ended assignment alone (only active ones are swept)", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const assignmentId = await createAssignment(therapist.therapistProfileId, child.id, HUNDRED_DAYS_AGO);
    await admin
      .from("therapist_child_assignments")
      .update({ status: "ended", ended_on: HUNDRED_DAYS_AGO, ended_reason: "manual" })
      .eq("id", assignmentId);

    await expireInactiveAssignments();

    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("status, ended_reason")
      .eq("id", assignmentId)
      .single();
    expect(assignment?.status).toBe("ended");
    expect(assignment?.ended_reason).toBe("manual");
  });
});

describe("E5 regression: assignment renewal", () => {
  it("renewTherapistChildAssignment creates a fresh active row and leaves the expired one untouched", async () => {
    const child = await createTestChild((await createTestParent()).userId);
    const therapist = await createTestTherapist();
    const adminUser = await makeTestAdmin();

    const assignmentId = await createAssignment(therapist.therapistProfileId, child.id, HUNDRED_DAYS_AGO);
    await admin
      .from("therapist_child_assignments")
      .update({ status: "expired", ended_on: HUNDRED_DAYS_AGO, ended_reason: "inactivity" })
      .eq("id", assignmentId);

    await enrollAndVerifyMfa(await signInAs(adminUser));

    const result = await renewTherapistChildAssignment(assignmentId);
    expect(result.ok).toBe(true);

    const { data: oldRow } = await admin
      .from("therapist_child_assignments")
      .select("status, ended_reason")
      .eq("id", assignmentId)
      .single();
    expect(oldRow?.status).toBe("expired");
    expect(oldRow?.ended_reason).toBe("inactivity");

    const { data: newRows } = await admin
      .from("therapist_child_assignments")
      .select("id, status")
      .eq("child_id", child.id)
      .eq("therapist_id", therapist.therapistProfileId)
      .eq("status", "active");
    expect(newRows?.length).toBe(1);
    trackForCleanup("therapist_child_assignments", newRows![0].id);
  });
});

describe("E5 regression: manual ending records a reason", () => {
  it("endTherapistChildAssignment sets ended_reason to 'manual'", async () => {
    const child = await createTestChild((await createTestParent()).userId);
    const therapist = await createTestTherapist();
    const adminUser = await makeTestAdmin();

    const assignmentId = await createAssignment(therapist.therapistProfileId, child.id, HUNDRED_DAYS_AGO);

    await enrollAndVerifyMfa(await signInAs(adminUser));

    const result = await endTherapistChildAssignment(assignmentId);
    expect(result.ok).toBe(true);

    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("status, ended_reason")
      .eq("id", assignmentId)
      .single();
    expect(assignment?.status).toBe("ended");
    expect(assignment?.ended_reason).toBe("manual");
  });
});
