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
} from "./helpers";
import { publishReport } from "@/lib/reports/actions";
import { approveAndPublishReport } from "@/lib/supervisor/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function createDraftReport(childId: string, therapistProfileId: string) {
  // is_assigned_therapist() (0086) -- which the reports/therapy_sessions RLS
  // policies both key off -- requires a real therapist_child_assignments
  // row, not just a therapy_sessions row referencing the therapist.
  const { data: assignment, error: assignmentError } = await admin
    .from("therapist_child_assignments")
    .insert({ child_id: childId, therapist_id: therapistProfileId, status: "active" })
    .select("id")
    .single();
  if (assignmentError || !assignment) throw new Error(`assignment fixture failed: ${assignmentError?.message}`);
  trackForCleanup("therapist_child_assignments", assignment.id);

  const { data: therapySession, error: sessionError } = await admin
    .from("therapy_sessions")
    .insert({ child_id: childId, therapist_id: therapistProfileId, status: "complete" })
    .select("id")
    .single();
  if (sessionError || !therapySession) throw new Error(`therapy_sessions fixture failed: ${sessionError?.message}`);
  trackForCleanup("therapy_sessions", therapySession.id);

  const { data: report, error: reportError } = await admin
    .from("reports")
    .insert({
      session_id: therapySession.id,
      status: "draft",
      therapist_body: { sections: [] },
      parent_body: { sections: [] },
    })
    .select("id")
    .single();
  if (reportError || !report) throw new Error(`reports fixture failed: ${reportError?.message}`);
  trackForCleanup("reports", report.id);
  return report.id;
}

async function assertParentCanSee(reportId: string, parent: { email: string; password: string }, expected: boolean) {
  const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: signInError } = await client.auth.signInWithPassword({ email: parent.email, password: parent.password });
  if (signInError) throw new Error(`assertParentCanSee sign-in failed: ${signInError.message}`);
  const { data } = await client.from("reports").select("id").eq("id", reportId).maybeSingle();
  expect(!!data).toBe(expected);
}

// E10/D5 regression: reports.status/approved_by/approved_at (migration 0010)
// anticipated a second-party approval step that nothing ever wired up --
// publishReport self-populated approved_by/approved_at with the publishing
// therapist's own id. Now a therapist with an active supervisor submits for
// that supervisor's approval instead of publishing directly.
describe("E10/D5 regression: report supervisor-approval gate", () => {
  it("an unsupervised therapist still publishes directly, unchanged", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const reportId = await createDraftReport(child.id, therapist.therapistProfileId);

    await signInAs(therapist);
    const result = await publishReport(reportId);
    expect(result.ok).toBe(true);
    expect(result.ok && result.pendingApproval).toBeFalsy();

    const { data: report } = await admin
      .from("reports")
      .select("status, published_at, approved_by")
      .eq("id", reportId)
      .single();
    expect(report?.status).toBe("published");
    expect(report?.published_at).toBeTruthy();
    expect(report?.approved_by).toBe(therapist.userId);

    await assertParentCanSee(reportId, parent, true);
  });

  it("a supervised therapist's publish submits for approval instead, and the parent can't see it yet", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const supervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
    await admin.from("supervisor_assignments").insert({
      supervisor_id: supervisor.userId,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });

    const reportId = await createDraftReport(child.id, therapist.therapistProfileId);

    await signInAs(therapist);
    const result = await publishReport(reportId);
    expect(result.ok).toBe(true);
    expect(result.ok && result.pendingApproval).toBe(true);

    const { data: report } = await admin
      .from("reports")
      .select("status, published_at, approved_by")
      .eq("id", reportId)
      .single();
    expect(report?.status).toBe("in_review");
    expect(report?.published_at).toBeNull();
    expect(report?.approved_by).toBeNull();

    await assertParentCanSee(reportId, parent, false);
  });

  it("the assigned supervisor can approve and publish it, and the parent can then see it", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const supervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
    await admin.from("supervisor_assignments").insert({
      supervisor_id: supervisor.userId,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });

    const reportId = await createDraftReport(child.id, therapist.therapistProfileId);
    await signInAs(therapist);
    await publishReport(reportId);
    signOut();

    await signInAs(supervisor);
    const result = await approveAndPublishReport(reportId);
    expect(result.ok).toBe(true);

    const { data: report } = await admin
      .from("reports")
      .select("status, published_at, approved_by")
      .eq("id", reportId)
      .single();
    expect(report?.status).toBe("published");
    expect(report?.published_at).toBeTruthy();
    expect(report?.approved_by).toBe(supervisor.userId);

    await assertParentCanSee(reportId, parent, true);
  });

  it("a supervisor's new UPDATE access cannot be used to edit report content, only to approve it", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const supervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
    await admin.from("supervisor_assignments").insert({
      supervisor_id: supervisor.userId,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });

    const reportId = await createDraftReport(child.id, therapist.therapistProfileId);
    await signInAs(therapist);
    await publishReport(reportId);
    signOut();

    const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: supervisor.email,
      password: supervisor.password,
    });
    if (signInError) throw new Error(`sign-in failed: ${signInError.message}`);

    // The supervisor's new UPDATE grant (0091) legally covers therapist_body
    // too (the GRANT is role-wide, not per-caller) -- only the trigger
    // stops them from actually using it to rewrite clinical content.
    const { error: tamperError } = await client
      .from("reports")
      .update({ therapist_body: { sections: [{ hacked: true }] } })
      .eq("id", reportId);
    expect(tamperError).toBeTruthy();

    const { data: report } = await admin.from("reports").select("therapist_body").eq("id", reportId).single();
    expect(report?.therapist_body).toEqual({ sections: [] });
  });

  it("a supervisor not on the therapist's team cannot approve their report", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const realSupervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", realSupervisor.userId);
    await admin.from("supervisor_assignments").insert({
      supervisor_id: realSupervisor.userId,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });

    const outsiderSupervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", outsiderSupervisor.userId);

    const reportId = await createDraftReport(child.id, therapist.therapistProfileId);
    await signInAs(therapist);
    await publishReport(reportId);
    signOut();

    await signInAs(outsiderSupervisor);
    const result = await approveAndPublishReport(reportId);
    expect(result.ok).toBe(false);

    const { data: report } = await admin.from("reports").select("status").eq("id", reportId).single();
    expect(report?.status).toBe("in_review");

    await assertParentCanSee(reportId, parent, false);
  });

  it("resubmitting while already in_review is idempotent", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const supervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
    await admin.from("supervisor_assignments").insert({
      supervisor_id: supervisor.userId,
      therapist_id: therapist.therapistProfileId,
      status: "active",
    });

    const reportId = await createDraftReport(child.id, therapist.therapistProfileId);
    await signInAs(therapist);
    await publishReport(reportId);
    const second = await publishReport(reportId);
    expect(second.ok).toBe(true);
    expect(second.ok && second.pendingApproval).toBe(true);

    const { data: report } = await admin.from("reports").select("status").eq("id", reportId).single();
    expect(report?.status).toBe("in_review");
  });
});
