import { describe, it, expect, afterEach } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  createTestSlot,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
  enrollAndVerifyMfa,
} from "./helpers";
import { createPendingBooking } from "@/lib/booking/actions";
import { offboardTherapist } from "@/lib/admin/actions";
import { getChildrenNeedingReassignment } from "@/lib/admin/queries";
import { updateGoalStatus } from "@/lib/programme/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function makeTestAdmin() {
  const adminUser = await createTestParent();
  await admin.from("users").update({ role: "admin" }).eq("id", adminUser.userId);
  return adminUser;
}

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

// E12 regression: a suspended therapist's profile disappears from discovery
// and their open slots can no longer be newly booked -- previously neither
// check existed, so a parent could pay for a session with someone who could
// never fulfill it.
describe("E12 regression: suspended therapists are no longer bookable", () => {
  it("excludes a suspended therapist from therapist_public_profiles", async () => {
    const therapist = await createTestTherapist();
    await createTestSlot(therapist.therapistProfileId);

    const { data: before } = await admin
      .from("therapist_public_profiles")
      .select("id")
      .eq("id", therapist.therapistProfileId)
      .maybeSingle();
    expect(before).toBeTruthy();

    await admin.from("users").update({ status: "suspended" }).eq("id", therapist.userId);

    const { data: after } = await admin
      .from("therapist_public_profiles")
      .select("id")
      .eq("id", therapist.therapistProfileId)
      .maybeSingle();
    expect(after).toBeNull();
  });

  it("rejects a new booking hold against a suspended therapist's slot", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const slot = await createTestSlot(therapist.therapistProfileId);
    await admin.from("users").update({ status: "suspended" }).eq("id", therapist.userId);

    await signInAs(parent);
    const result = await createPendingBooking({
      childId: child.id,
      therapistId: therapist.therapistProfileId,
      slotId: slot.id,
      sessionType: "virtual",
    });
    expect(result.ok).toBe(false);
  });
});

// E12 regression: offboardTherapist runs the full departure cascade --
// distinct from a plain suspend, which touches nothing beyond the login gate.
describe("E12 regression: offboarding cascade", () => {
  it("ends active assignments, cancels future bookings with a queued refund, and blocks the account", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist({ priceNaira: 15000 });
    const adminUser = await makeTestAdmin();

    const assignmentId = await createActiveAssignment(therapist.therapistProfileId, child.id);

    // A future confirmed, paid booking -- direct DB fixture (past the
    // MIN_BOOKING_NOTICE_MS real createPendingBooking would enforce isn't
    // the point of this test).
    const slot = await createTestSlot(therapist.therapistProfileId, { hoursFromNow: 48 });
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        parent_id: parent.userId,
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        availability_slot_id: slot.id,
        status: "confirmed",
        session_type: "virtual",
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(`booking fixture failed: ${bookingError?.message}`);
    trackForCleanup("bookings", booking.id);
    const reference = `test_offboard_${booking.id}`;
    await admin.from("payments").insert({
      booking_id: booking.id,
      payer_id: parent.userId,
      payee_id: therapist.userId,
      amount: 15000,
      type: "session_commission",
      gateway_reference: reference,
      status: "successful",
    });
    trackForCleanup("payments", reference, "gateway_reference");

    await enrollAndVerifyMfa(await signInAs(adminUser));
    const result = await offboardTherapist(therapist.userId);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.result.assignmentsEnded).toBe(1);
    expect(result.result.bookingsCancelled).toBe(1);

    const { data: assignment } = await admin
      .from("therapist_child_assignments")
      .select("status, ended_reason")
      .eq("id", assignmentId)
      .single();
    expect(assignment?.status).toBe("ended");
    expect(assignment?.ended_reason).toBe("therapist_departed");

    const { data: bookingRow } = await admin
      .from("bookings")
      .select("status, refund_amount")
      .eq("id", booking.id)
      .single();
    expect(bookingRow?.status).toBe("cancelled");
    expect(bookingRow?.refund_amount).toBe(15000); // full refund, therapist-initiated tier

    const { data: slotRow } = await admin.from("availability_slots").select("is_booked").eq("id", slot.id).single();
    expect(slotRow?.is_booked).toBe(false);

    const { data: userRow } = await admin.from("users").select("status").eq("id", therapist.userId).single();
    expect(userRow?.status).toBe("suspended");
  });

  it("leaves an already-past confirmed booking alone", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const adminUser = await makeTestAdmin();

    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 60 * 60 * 1000);
    const { data: slot, error: slotError } = await admin
      .from("availability_slots")
      .insert({
        therapist_id: therapist.therapistProfileId,
        start_time: pastStart.toISOString(),
        end_time: pastEnd.toISOString(),
        session_type: "virtual",
        is_booked: true,
      })
      .select("id")
      .single();
    if (slotError || !slot) throw new Error(`slot fixture failed: ${slotError?.message}`);
    trackForCleanup("availability_slots", slot.id);

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        parent_id: parent.userId,
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        availability_slot_id: slot.id,
        status: "confirmed",
        session_type: "virtual",
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(`booking fixture failed: ${bookingError?.message}`);
    trackForCleanup("bookings", booking.id);

    await enrollAndVerifyMfa(await signInAs(adminUser));
    const result = await offboardTherapist(therapist.userId);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.result.bookingsCancelled).toBe(0);

    const { data: bookingRow } = await admin.from("bookings").select("status").eq("id", booking.id).single();
    expect(bookingRow?.status).toBe("confirmed");
  });

  it("rejects offboarding a non-therapist account", async () => {
    const parent = await createTestParent();
    const adminUser = await makeTestAdmin();
    await enrollAndVerifyMfa(await signInAs(adminUser));
    const result = await offboardTherapist(parent.userId);
    expect(result.ok).toBe(false);
  });

  it("surfaces a child in the reassignment queue only while they have zero active therapist", async () => {
    const parent = await createTestParent();
    const childAlone = await createTestChild(parent.userId);
    const childWithBackup = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    const backupTherapist = await createTestTherapist();
    const adminUser = await makeTestAdmin();

    await createActiveAssignment(therapist.therapistProfileId, childAlone.id);
    await createActiveAssignment(therapist.therapistProfileId, childWithBackup.id);
    await createActiveAssignment(backupTherapist.therapistProfileId, childWithBackup.id);

    await enrollAndVerifyMfa(await signInAs(adminUser));
    const result = await offboardTherapist(therapist.userId);
    expect(result.ok).toBe(true);

    const queue = await getChildrenNeedingReassignment();
    const queuedIds = queue.map((c) => c.childId);
    expect(queuedIds).toContain(childAlone.id);
    expect(queuedIds).not.toContain(childWithBackup.id); // backupTherapist is still active
  });
});

// E12 regression: a goal only the departed therapist could manage doesn't
// stay permanently frozen -- any currently-assigned therapist on that child
// can take over managing it, without rewriting who actually wrote it.
describe("E12 regression: goal handover after departure", () => {
  it("lets a currently-assigned therapist update a departed colleague's goal, but not an outsider", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const departed = await createTestTherapist();
    const newTherapist = await createTestTherapist();
    const outsider = await createTestTherapist();
    const adminUser = await makeTestAdmin();

    await createActiveAssignment(departed.therapistProfileId, child.id);
    await createActiveAssignment(newTherapist.therapistProfileId, child.id);

    const { data: goal, error: goalError } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: departed.therapistProfileId, title: "Orphaned goal" })
      .select("id")
      .single();
    if (goalError || !goal) throw new Error(`goal fixture failed: ${goalError?.message}`);
    trackForCleanup("goals", goal.id);

    await enrollAndVerifyMfa(await signInAs(adminUser));
    await offboardTherapist(departed.userId);
    signOut();

    // The outsider (not assigned to this child at all) still can't touch it.
    await signInAs(outsider);
    const outsiderResult = await updateGoalStatus(goal.id, "met");
    expect(outsiderResult.ok).toBe(false);
    signOut();

    // The newly (and still) assigned therapist can now manage it.
    await signInAs(newTherapist);
    const result = await updateGoalStatus(goal.id, "met");
    expect(result.ok).toBe(true);

    const { data: goalRow } = await admin.from("goals").select("status, therapist_id").eq("id", goal.id).single();
    expect(goalRow?.status).toBe("met");
    expect(goalRow?.therapist_id).toBe(departed.therapistProfileId); // attribution preserved
  });

  it("rejects any attempt to change a goal's child_id or therapist_id", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const otherChild = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    await createActiveAssignment(therapist.therapistProfileId, child.id);
    await createActiveAssignment(therapist.therapistProfileId, otherChild.id);

    const { data: goal, error: goalError } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, title: "Immutable goal" })
      .select("id")
      .single();
    if (goalError || !goal) throw new Error(`goal fixture failed: ${goalError?.message}`);
    trackForCleanup("goals", goal.id);

    const { error: reassignError } = await admin.from("goals").update({ child_id: otherChild.id }).eq("id", goal.id);
    expect(reassignError).toBeTruthy();
  });
});
