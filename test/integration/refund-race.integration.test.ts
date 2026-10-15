import { describe, it, expect, beforeEach, afterEach } from "vitest";

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
} from "./helpers";
import { flutterwaveMock } from "./mocks";
import { processRefund } from "@/lib/admin/actions";

const admin = testAdminClient;

beforeEach(() => {
  flutterwaveMock.createRefund.mockClear();
  // These tests are about the claim on refund_status; the fake answers
  // "processing" so the refund stays in that state for the assertions.
  flutterwaveMock.createRefund.mockResolvedValue({ id: "RF_processing", status: "processing" });
});

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function makeTestAdmin() {
  const adminUser = await createTestParent();
  await admin.from("users").update({ role: "admin" }).eq("id", adminUser.userId);
  return adminUser;
}

// BOOK-03 regression (pre-launch audit, P1): processRefund used to call
// Flutterwave's refund API BEFORE claiming bookings.refund_status -- the claim
// was a plain read-then-write, not atomic. A double-click, or two admins
// acting on the same refund queue, could both read refund_status as unset
// and both call Flutterwave before either write landed.
describe("BOOK-03 regression: a refund can't be processed twice", () => {
  it("two truly concurrent processRefund calls for the same payment only fire Flutterwave once", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist({ priceNaira: 15000 });
    const slot = await createTestSlot(therapist.therapistProfileId);
    const adminUser = await makeTestAdmin();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        parent_id: parent.userId,
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        availability_slot_id: slot.id,
        status: "cancelled",
        session_type: "virtual",
        refund_amount: 15000,
        cancellation_reason: "parent",
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(`booking fixture failed: ${bookingError?.message}`);
    trackForCleanup("bookings", booking.id);

    const reference = `test_refund_race_${booking.id}`;
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        booking_id: booking.id,
        payer_id: parent.userId,
        payee_id: therapist.userId,
        amount: 15000,
        type: "session_commission",
        gateway: "flutterwave",
        gateway_reference: reference,
        gateway_transaction_id: reference,
        status: "successful",
      })
      .select("id")
      .single();
    if (paymentError || !payment) throw new Error(`payment fixture failed: ${paymentError?.message}`);
    trackForCleanup("payments", payment.id);

    await signInAs(adminUser);

    const [a, b] = await Promise.all([processRefund(payment.id), processRefund(payment.id)]);
    const results = [a, b];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].ok || failed[0].error).toBeTruthy();

    expect(flutterwaveMock.createRefund).toHaveBeenCalledTimes(1);

    const { data: bookingAfter } = await admin.from("bookings").select("refund_status").eq("id", booking.id).single();
    expect(bookingAfter?.refund_status).toBe("processing");
  });

  it("releases the claim on a genuine Flutterwave failure so a retry can still succeed", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist({ priceNaira: 15000 });
    const slot = await createTestSlot(therapist.therapistProfileId);
    const adminUser = await makeTestAdmin();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        parent_id: parent.userId,
        child_id: child.id,
        therapist_id: therapist.therapistProfileId,
        availability_slot_id: slot.id,
        status: "cancelled",
        session_type: "virtual",
        refund_amount: 15000,
        cancellation_reason: "parent",
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(`booking fixture failed: ${bookingError?.message}`);
    trackForCleanup("bookings", booking.id);

    const reference = `test_refund_retry_${booking.id}`;
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        booking_id: booking.id,
        payer_id: parent.userId,
        payee_id: therapist.userId,
        amount: 15000,
        type: "session_commission",
        gateway: "flutterwave",
        gateway_reference: reference,
        gateway_transaction_id: reference,
        status: "successful",
      })
      .select("id")
      .single();
    if (paymentError || !payment) throw new Error(`payment fixture failed: ${paymentError?.message}`);
    trackForCleanup("payments", payment.id);

    await signInAs(adminUser);

    flutterwaveMock.createRefund.mockRejectedValueOnce(new Error("Flutterwave is briefly unavailable"));
    const first = await processRefund(payment.id);
    expect(first.ok).toBe(false);

    const { data: afterFailure } = await admin.from("bookings").select("refund_status").eq("id", booking.id).single();
    expect(afterFailure?.refund_status).toBeNull();

    const second = await processRefund(payment.id);
    expect(second.ok).toBe(true);
    expect(flutterwaveMock.createRefund).toHaveBeenCalledTimes(2);
  });
});
