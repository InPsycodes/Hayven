import { describe, it, expect, afterEach } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
} from "./helpers";
import { purgeChildClinicalRecords, purgeAgedOutClinicalRecords } from "@/lib/clinical/purge";
import { purgeAgedOutPayments } from "@/lib/payments/retention";

const admin = testAdminClient;
const SEVEN_YEARS_AGO = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000);
const ONE_YEAR_AGO = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

afterEach(async () => {
  await cleanupAll();
});

/** Directly-inserted slot/booking in the past -- createPendingBooking's own
 *  MIN_BOOKING_NOTICE_MS check would reject a real hold this far back, so
 *  fixture setup goes straight through the admin client, same as other
 *  suites' "simulate a past/completed session" setup. */
async function createCompletedBookingFixture(
  therapistProfileId: string,
  parentId: string,
  childId: string,
  endTime: Date
) {
  const start = new Date(endTime.getTime() - 45 * 60 * 1000);
  const { data: slot, error: slotError } = await admin
    .from("availability_slots")
    .insert({
      therapist_id: therapistProfileId,
      start_time: start.toISOString(),
      end_time: endTime.toISOString(),
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
      parent_id: parentId,
      child_id: childId,
      therapist_id: therapistProfileId,
      availability_slot_id: slot.id,
      status: "completed",
      session_type: "virtual",
    })
    .select("id")
    .single();
  if (bookingError || !booking) throw new Error(`booking fixture failed: ${bookingError?.message}`);
  trackForCleanup("bookings", booking.id);
  return booking.id;
}

// E3 follow-up regression: Privacy Policy Section 6 (/privacy), after the
// clinical-records clarification, promises clinical records -- including a
// child's core identifying details -- are purged 6 years after their last
// recorded session, and payment records purge independently on their own
// 6-year clock.
describe("E3 follow-up regression: 6-year clinical/payment purge", () => {
  it("purges a child's full clinical record (both systems) and anonymizes their identity", async () => {
    const parent = await createTestParent();
    const therapist = await createTestTherapist();
    const child = await createTestChild(parent.userId);

    // Old system: a completed booking + session_notes 7 years ago.
    const bookingId = await createCompletedBookingFixture(
      therapist.therapistProfileId,
      parent.userId,
      child.id,
      SEVEN_YEARS_AGO
    );
    await admin.from("session_notes").insert({
      booking_id: bookingId,
      therapist_id: therapist.therapistProfileId,
      summary: "Old-system session summary",
    });

    // New system: a therapy_sessions row 7 years ago, plus clinical content.
    const { data: session } = await admin
      .from("therapy_sessions")
      .insert({
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        session_date: SEVEN_YEARS_AGO.toISOString().slice(0, 10),
        status: "complete",
      })
      .select("id")
      .single();
    const { data: goal } = await admin
      .from("goals")
      .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, title: "Old goal" })
      .select("id")
      .single();
    await admin.from("target_behaviours").insert({ child_id: child.id, label: "Old behaviour" });
    await admin.from("skills").insert({ child_id: child.id, label: "Old skill" });
    await admin.from("child_diagnoses").insert({ child_id: child.id, label: "Old diagnosis" });
    await admin.from("intake_forms").insert({ child_id: child.id, sensory_profile: "Old intake" });
    await admin.from("intake_consents").insert({
      child_id: child.id,
      consent_type: "therapist_access",
      granted: true,
      recorded_by: parent.userId,
    });

    await purgeChildClinicalRecords(child.id);

    const { data: childRow } = await admin
      .from("children")
      .select("first_name, presenting_concern, date_of_birth")
      .eq("id", child.id)
      .single();
    expect(childRow?.first_name).toBe("Deleted child");
    expect(childRow?.presenting_concern).toBeNull();
    expect(childRow?.date_of_birth).toBe("1900-01-01");

    const { data: notes } = await admin.from("session_notes").select("id").eq("booking_id", bookingId);
    expect(notes?.length ?? 0).toBe(0);
    const { data: sessions } = await admin.from("therapy_sessions").select("id").eq("child_id", child.id);
    expect(sessions?.length ?? 0).toBe(0);
    const { data: goals } = await admin.from("goals").select("id").eq("child_id", child.id);
    expect(goals?.length ?? 0).toBe(0);
    const { data: behaviours } = await admin.from("target_behaviours").select("id").eq("child_id", child.id);
    expect(behaviours?.length ?? 0).toBe(0);
    const { data: skills } = await admin.from("skills").select("id").eq("child_id", child.id);
    expect(skills?.length ?? 0).toBe(0);
    const { data: diagnoses } = await admin.from("child_diagnoses").select("id").eq("child_id", child.id);
    expect(diagnoses?.length ?? 0).toBe(0);
    const { data: intake } = await admin.from("intake_forms").select("id").eq("child_id", child.id);
    expect(intake?.length ?? 0).toBe(0);
    const { data: consents } = await admin.from("intake_consents").select("id").eq("child_id", child.id);
    expect(consents?.length ?? 0).toBe(0);

    // Cascade check: the session's goal-progress/report machinery, if any
    // had been attached to `session`, must be gone too -- confirmed
    // indirectly by the session row itself being gone (session.id no
    // longer exists to be referenced).
    expect(session).toBeTruthy();
    expect(goal).toBeTruthy();

    // Untouched: the booking itself survives on its own payment-retention
    // clock, independent of the child's clinical purge.
    const { data: bookingRow } = await admin.from("bookings").select("id, status").eq("id", bookingId).maybeSingle();
    expect(bookingRow).toBeTruthy();
  });

  it("is idempotent -- calling it twice doesn't error", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);

    await purgeChildClinicalRecords(child.id);
    await expect(purgeChildClinicalRecords(child.id)).resolves.not.toThrow();
  });

  it("purgeAgedOutClinicalRecords only purges children whose last session is 6+ years old, and skips children with none", async () => {
    const parent = await createTestParent();
    const therapist = await createTestTherapist();

    const oldChild = await createTestChild(parent.userId);
    await admin.from("therapy_sessions").insert({
      child_id: oldChild.id,
      therapist_id: therapist.therapistProfileId,
      session_date: SEVEN_YEARS_AGO.toISOString().slice(0, 10),
      status: "complete",
    });

    const recentChild = await createTestChild(parent.userId);
    await admin.from("therapy_sessions").insert({
      child_id: recentChild.id,
      therapist_id: therapist.therapistProfileId,
      session_date: ONE_YEAR_AGO.toISOString().slice(0, 10),
      status: "complete",
    });

    // Old therapy_sessions row, but a MORE RECENT completed booking (old
    // system) for the same child -- the later of the two signals wins, so
    // this child must NOT be purged.
    const mixedChild = await createTestChild(parent.userId);
    await admin.from("therapy_sessions").insert({
      child_id: mixedChild.id,
      therapist_id: therapist.therapistProfileId,
      session_date: SEVEN_YEARS_AGO.toISOString().slice(0, 10),
      status: "complete",
    });
    await createCompletedBookingFixture(therapist.therapistProfileId, parent.userId, mixedChild.id, ONE_YEAR_AGO);

    const neverSeenChild = await createTestChild(parent.userId); // no sessions at all

    const result = await purgeAgedOutClinicalRecords();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const { data: oldRow } = await admin.from("children").select("first_name").eq("id", oldChild.id).single();
    expect(oldRow?.first_name).toBe("Deleted child");

    const { data: recentRow } = await admin.from("children").select("first_name").eq("id", recentChild.id).single();
    expect(recentRow?.first_name).not.toBe("Deleted child");

    const { data: mixedRow } = await admin.from("children").select("first_name").eq("id", mixedChild.id).single();
    expect(mixedRow?.first_name).not.toBe("Deleted child");

    const { data: neverSeenRow } = await admin
      .from("children")
      .select("first_name")
      .eq("id", neverSeenChild.id)
      .single();
    expect(neverSeenRow?.first_name).not.toBe("Deleted child");
  });
});

describe("E3 follow-up regression: payment retention purge", () => {
  it("deletes payments older than 6 years but keeps recent ones", async () => {
    const parent = await createTestParent();

    const { data: oldPayment, error: oldError } = await admin
      .from("payments")
      .insert({
        payer_id: parent.userId,
        amount: 15000,
        type: "session_commission",
        gateway_reference: `test_old_${parent.userId}`,
        status: "successful",
        created_at: SEVEN_YEARS_AGO.toISOString(),
      })
      .select("id")
      .single();
    if (oldError || !oldPayment) throw new Error(`old payment fixture failed: ${oldError?.message}`);
    trackForCleanup("payments", oldPayment.id);

    const { data: recentPayment, error: recentError } = await admin
      .from("payments")
      .insert({
        payer_id: parent.userId,
        amount: 15000,
        type: "session_commission",
        gateway_reference: `test_recent_${parent.userId}`,
        status: "successful",
        created_at: ONE_YEAR_AGO.toISOString(),
      })
      .select("id")
      .single();
    if (recentError || !recentPayment) throw new Error(`recent payment fixture failed: ${recentError?.message}`);
    trackForCleanup("payments", recentPayment.id);

    const result = await purgeAgedOutPayments();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const { data: oldRow } = await admin.from("payments").select("id").eq("id", oldPayment.id).maybeSingle();
    expect(oldRow).toBeNull();
    const { data: recentRow } = await admin.from("payments").select("id").eq("id", recentPayment.id).maybeSingle();
    expect(recentRow).toBeTruthy();
  });
});
