import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  createTestSlot,
  makeAdmin,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
  type TestParent,
  type TestTherapist,
} from "./helpers";
import { paystackMock } from "./mocks";
import { createPendingBooking, finalizeBookingPayment, markNoShow } from "@/lib/booking/actions";
import { initiatePaystackPayment } from "@/lib/payments/actions";
import { runPayouts } from "@/lib/payouts/actions";
import { recordSessionEarnings } from "@/lib/payouts/earnings";
import { processRefund } from "@/lib/admin/actions";
import { splitEarning, EARNING_HOLD_MS, DISPUTE_WINDOW_MS } from "@/lib/payouts/commission";

const admin = testAdminClient;

beforeEach(() => {
  paystackMock.initializeTransaction.mockClear();
  paystackMock.verifyTransaction.mockClear();
  paystackMock.createRefund.mockClear();
  paystackMock.createTransferRecipient.mockClear();
  paystackMock.initiateTransfer.mockClear();
});

afterEach(async () => {
  signOut();
  await cleanupAll();
});

/**
 * Creates a parent + child + therapist + a booked, paid, completed session
 * with its earning force-fast-forwarded past the 72h hold (EARNING_HOLD_MS)
 * so it's immediately payable -- this suite is testing the payout claim
 * logic, not the hold period, so bypassing the wait via a direct admin
 * update is the right call rather than waiting 72 real hours.
 */
async function setupPayableEarning(priceNaira = 15000) {
  const parent = await createTestParent();
  const child = await createTestChild(parent.userId);
  const therapist = await createTestTherapist({ priceNaira });
  const slot = await createTestSlot(therapist.therapistProfileId);

  await signInAs(parent);
  const hold = await createPendingBooking({
    childId: child.id,
    therapistId: therapist.therapistProfileId,
    slotId: slot.id,
    sessionType: "virtual",
  });
  if (!hold.ok) throw new Error(`createPendingBooking failed: ${hold.error}`);
  trackForCleanup("bookings", hold.bookingId);

  const pay = await initiatePaystackPayment(hold.bookingId, therapist.therapistProfileId);
  if (!pay.ok) throw new Error(`initiatePaystackPayment failed: ${pay.error}`);

  const reference = `test_ref_${hold.bookingId}`;
  const amountKobo = priceNaira * 100;
  const finalize = await finalizeBookingPayment(hold.bookingId, reference, amountKobo);
  if (!finalize.ok) throw new Error(`finalizeBookingPayment failed: ${finalize.error}`);
  trackForCleanup("payments", reference, "gateway_reference");

  // Simulate the session having happened and completed (this is normally
  // autoCompletePastBookings' job on a read, once the slot's end_time has
  // passed -- setting it directly here isolates this suite from real-time
  // waiting, same rationale as the payable_at fast-forward below).
  const { error: completeErr } = await admin.from("bookings").update({ status: "completed" }).eq("id", hold.bookingId);
  if (completeErr) throw new Error(`completing booking failed: ${completeErr.message}`);

  await recordSessionEarnings(admin, [hold.bookingId]);

  const { error: payableErr } = await admin
    .from("therapist_earnings")
    .update({ payable_at: new Date(Date.now() - 1000).toISOString() })
    .eq("booking_id", hold.bookingId);
  if (payableErr) throw new Error(`fast-forwarding payable_at failed: ${payableErr.message}`);

  signOut();
  return { parent, child, therapist, slot, bookingId: hold.bookingId, paymentReference: reference, priceNaira };
}

async function makeTestAdmin(): Promise<TestParent> {
  const admin_ = await createTestParent();
  await makeAdmin(admin_.userId);
  return admin_;
}

describe("money flow: create hold -> pay -> complete -> earn -> payout", () => {
  it("happy path pays the therapist exactly their net share", async () => {
    const { bookingId, priceNaira } = await setupPayableEarning(15000);
    const { net } = splitEarning(priceNaira);

    const adminUser = await makeTestAdmin();
    await signInAs(adminUser);
    const result = await runPayouts();

    expect(result.ok).toBe(true);
    expect(result.created).toBe(1);
    expect(result.paidNaira).toBe(net);
    expect(paystackMock.initiateTransfer).toHaveBeenCalledTimes(1);

    const { data: earning } = await admin
      .from("therapist_earnings")
      .select("status, payout_id")
      .eq("booking_id", bookingId)
      .single();
    expect(earning?.status).toBe("paid");
    expect(earning?.payout_id).toBeTruthy();

    const { data: payout } = await admin.from("payouts").select("status, amount").eq("id", earning!.payout_id).single();
    expect(payout?.status).toBe("paid");
    expect(payout?.amount).toBe(net);

    trackForCleanup("payouts", earning!.payout_id as string);
  });
});

describe("H-1 regression: concurrent runPayouts cannot double-pay", () => {
  it("two simultaneous payout runs claim the same earning exactly once", async () => {
    const { therapist, bookingId, priceNaira } = await setupPayableEarning(20000);
    const { net } = splitEarning(priceNaira);

    const adminUser = await makeTestAdmin();
    await signInAs(adminUser);

    // The real race this reproduces: an admin double-clicking "Run
    // payouts", or opening /admin/payouts in two tabs -- both requests hit
    // the server within the same window, both reading the same pending
    // earnings before either has claimed them.
    const [a, b] = await Promise.all([runPayouts(), runPayouts()]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);

    // Exactly one of the two runs actually claimed and paid this earning --
    // the other must see it as already claimed (created: 0) or skipped.
    const totalCreated = a.created + b.created;
    const totalPaid = a.paidNaira + b.paidNaira;
    expect(totalCreated).toBe(1);
    expect(totalPaid).toBe(net);

    // The therapist was transferred money exactly once, not twice -- this
    // is the actual money-loss H-1 described, not just a row-count check.
    expect(paystackMock.initiateTransfer).toHaveBeenCalledTimes(1);

    const { data: earning } = await admin
      .from("therapist_earnings")
      .select("status, payout_id")
      .eq("booking_id", bookingId)
      .single();
    expect(earning?.status).toBe("paid");

    const { data: payouts } = await admin.from("payouts").select("id, status, amount").eq("therapist_id", therapist.therapistProfileId);
    const paidPayouts = (payouts ?? []).filter((p) => p.status === "paid");
    expect(paidPayouts).toHaveLength(1);
    expect(paidPayouts[0].amount).toBe(net);
    for (const p of payouts ?? []) trackForCleanup("payouts", p.id);
  });
});

describe("M-2 regression: a refund outside the dispute flow reverses the therapist's earning", () => {
  it("processRefund reverses the pending earning on that booking", async () => {
    const { bookingId, paymentReference } = await setupPayableEarning(15000);

    const { data: payment } = await admin.from("payments").select("id").eq("gateway_reference", paymentReference).single();
    expect(payment).toBeTruthy();

    const adminUser = await makeTestAdmin();
    await signInAs(adminUser);
    const result = await processRefund(payment!.id);

    expect(result.ok).toBe(true);
    expect(paystackMock.createRefund).toHaveBeenCalledTimes(1);

    const { data: booking } = await admin.from("bookings").select("refund_status").eq("id", bookingId).single();
    expect(booking?.refund_status).toBe("processing");

    // The actual bug this regression-tests: before the fix, the earning
    // stayed 'pending' here and would still have been paid out in full on
    // the next payout run, on top of the parent's refund.
    const { data: earning } = await admin.from("therapist_earnings").select("status").eq("booking_id", bookingId).single();
    expect(earning?.status).toBe("reversed");
  });
});

describe("Booking-slot hold race (pre-existing, regression lock-in)", () => {
  it("two concurrent holds on the same slot: exactly one succeeds", async () => {
    const parentA = await createTestParent();
    const childA = await createTestChild(parentA.userId);
    const parentB = await createTestParent();
    const childB = await createTestChild(parentB.userId);
    const therapist = await createTestTherapist();
    const slot = await createTestSlot(therapist.therapistProfileId);

    async function attempt(parent: TestParent, childId: string) {
      await signInAs(parent);
      return createPendingBooking({
        childId,
        therapistId: therapist.therapistProfileId,
        slotId: slot.id,
        sessionType: "virtual",
      });
    }

    const [resA, resB] = await Promise.all([attempt(parentA, childA.id), attempt(parentB, childB.id)]);
    const results = [resA, resB];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (succeeded[0].ok) trackForCleanup("bookings", succeeded[0].bookingId);

    const { data: slotRow } = await admin.from("availability_slots").select("is_booked").eq("id", slot.id).single();
    expect(slotRow?.is_booked).toBe(true);
  });
});

describe("M-5 regression: markNoShow can't be used on an already-completed session", () => {
  it("rejects marking a completed session as a no-show", async () => {
    const { therapist, bookingId } = await setupPayableEarning(15000);

    const therapistSignIn: TestTherapist = therapist;
    await signInAs(therapistSignIn);
    const result = await markNoShow(bookingId, "trying to flip a completed session");

    expect(result.ok).toBe(false);

    const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(booking?.status).toBe("completed");
  });

  it("allows marking a still-confirmed, past-ended session as a no-show", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist();
    // A slot that both clears MIN_BOOKING_NOTICE_MS at creation time and has
    // already ended by the time markNoShow runs.
    const slot = await createTestSlot(therapist.therapistProfileId, { hoursFromNow: 3 });

    await signInAs(parent);
    const hold = await createPendingBooking({
      childId: child.id,
      therapistId: therapist.therapistProfileId,
      slotId: slot.id,
      sessionType: "virtual",
    });
    if (!hold.ok) throw new Error(hold.error);
    trackForCleanup("bookings", hold.bookingId);

    const finalize = await finalizeBookingPayment(hold.bookingId, `test_ref_${hold.bookingId}`, 1500000);
    if (!finalize.ok) throw new Error(finalize.error);
    trackForCleanup("payments", `test_ref_${hold.bookingId}`, "gateway_reference");

    // Force the slot into the past without touching MIN_BOOKING_NOTICE_MS
    // (which only gates creation time).
    await admin
      .from("availability_slots")
      .update({ start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), end_time: new Date(Date.now() - 15 * 60 * 1000).toISOString() })
      .eq("id", slot.id);

    signOut();
    await signInAs(therapist);
    const result = await markNoShow(hold.bookingId, "family did not join");
    expect(result.ok).toBe(true);

    const { data: booking } = await admin.from("bookings").select("status, refund_amount").eq("id", hold.bookingId).single();
    expect(booking?.status).toBe("no_show");
    expect(booking?.refund_amount).toBe(0);
  });
});

describe("E1 regression: an earning isn't payable until the dispute window on it has closed", () => {
  it("a real (non-fast-forwarded) earning's payable_at lands after the 7-day dispute window, and a payout run skips it", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist({ priceNaira: 15000 });
    const slot = await createTestSlot(therapist.therapistProfileId);

    await signInAs(parent);
    const hold = await createPendingBooking({
      childId: child.id,
      therapistId: therapist.therapistProfileId,
      slotId: slot.id,
      sessionType: "virtual",
    });
    if (!hold.ok) throw new Error(`createPendingBooking failed: ${hold.error}`);
    trackForCleanup("bookings", hold.bookingId);

    const finalize = await finalizeBookingPayment(hold.bookingId, `test_ref_${hold.bookingId}`, 1500000);
    if (!finalize.ok) throw new Error(`finalizeBookingPayment failed: ${finalize.error}`);
    trackForCleanup("payments", `test_ref_${hold.bookingId}`, "gateway_reference");

    await admin.from("bookings").update({ status: "completed" }).eq("id", hold.bookingId);

    // Real call, no fast-forward this time -- payable_at is computed from
    // the actual EARNING_HOLD_MS, exactly as it would be in production.
    await recordSessionEarnings(admin, [hold.bookingId]);

    const { data: earning } = await admin
      .from("therapist_earnings")
      .select("payable_at")
      .eq("booking_id", hold.bookingId)
      .single();
    trackForCleanup("therapist_earnings", hold.bookingId, "booking_id");

    // recordSessionEarnings computes payable_at from the SLOT's end_time,
    // not from "now" -- createTestSlot's default books ~4h45m out, so the
    // expected value has to be anchored to the real slot end, not to the
    // moment this test happens to run.
    const { data: slotRow } = await admin.from("availability_slots").select("end_time").eq("id", slot.id).single();
    const slotEndMs = new Date(slotRow!.end_time).getTime();
    const payableAt = new Date(earning!.payable_at).getTime();
    const now = Date.now();

    // The actual bug: payable_at used to land inside the still-open dispute
    // window (72h hold vs. a 7-day window, measured from session end). It
    // must now land at or after the window closes.
    expect(payableAt).toBeGreaterThanOrEqual(slotEndMs + DISPUTE_WINDOW_MS - 1000);
    expect(payableAt - slotEndMs).toBeCloseTo(EARNING_HOLD_MS, -4);
    // And, concretely, well after "now" -- a payout run this instant has
    // nothing to claim.
    expect(payableAt).toBeGreaterThan(now);

    signOut();
    const adminUser = await makeTestAdmin();
    await signInAs(adminUser);

    // Not fast-forwarded, so still well within the hold -- a real payout
    // run right now must not touch it.
    const result = await runPayouts();
    expect(result.ok).toBe(true);
    expect(result.created).toBe(0);

    const { data: afterRun } = await admin
      .from("therapist_earnings")
      .select("status")
      .eq("booking_id", hold.bookingId)
      .single();
    expect(afterRun?.status).toBe("pending");
  });
});
