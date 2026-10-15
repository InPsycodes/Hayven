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
import { createPendingBooking } from "@/lib/booking/actions";
import { reconcilePayments } from "@/lib/payments/reconciliation";

const admin = testAdminClient;

beforeEach(() => {
  flutterwaveMock.listSuccessfulTransactions.mockClear();
  flutterwaveMock.verifyTransaction.mockClear();
});

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// E18(b) regression: the sweep that closes the gap E2 (src/lib/booking/
// actions.ts finalizeBookingPayment) left open -- a charge whose webhook AND
// redirect-verify fallback both never fired, so finalizeBookingPayment was
// never even called for it.
describe("E18(b) regression: payment reconciliation sweep", () => {
  it("replays a successful Flutterwave charge that never reached finalizeBookingPayment", async () => {
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
    signOut();

    // Simulate the total-loss case: neither the webhook nor the redirect
    // fallback ever ran finalizeBookingPayment for this charge -- the
    // booking is still sitting at pending_payment, no payments row exists,
    // exactly as if the browser closed mid-redirect during an outage.
    // Our tx_ref format, which is how the sweep finds the booking.
    const reference = `hv_${hold.bookingId}_1`;
    flutterwaveMock.listSuccessfulTransactions.mockResolvedValueOnce([
      { id: "9100000001", txRef: reference, status: "successful", amountNaira: 15000, currency: "NGN" },
    ]);
    trackForCleanup("payments", reference, "gateway_reference");

    const result = await reconcilePayments();

    expect(result.gatewayChecked).toBe(1);
    expect(result.replayed).toBe(1);
    expect(result.stillUnresolved).toBe(0);

    const { data: booking } = await admin.from("bookings").select("status").eq("id", hold.bookingId).single();
    expect(booking?.status).toBe("confirmed");

    const { data: payment } = await admin
      .from("payments")
      .select("status, booking_id")
      .eq("gateway_reference", reference)
      .single();
    expect(payment?.status).toBe("successful");
    expect(payment?.booking_id).toBe(hold.bookingId);
  });

  it("does not re-replay a charge Hayven already recorded", async () => {
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
    signOut();

    // This time the webhook DID land already -- a normal successful payment
    // sitting in the DB. The sweep must recognize it and leave it alone.
    const reference = `hv_${hold.bookingId}_2`;
    await admin.from("bookings").update({ status: "confirmed" }).eq("id", hold.bookingId);
    await admin.from("payments").insert({
      booking_id: hold.bookingId,
      payer_id: parent.userId,
      amount: 15000,
      type: "session_commission",
      gateway_reference: reference,
      status: "successful",
    });
    trackForCleanup("payments", reference, "gateway_reference");

    flutterwaveMock.listSuccessfulTransactions.mockResolvedValueOnce([
      { id: "9100000002", txRef: reference, status: "successful", amountNaira: 15000, currency: "NGN" },
    ]);

    const result = await reconcilePayments();
    expect(result.replayed).toBe(0);
    expect(result.stillUnresolved).toBe(0);
  });

  it("flags a DB-recorded payment that Flutterwave no longer confirms as successful", async () => {
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
    signOut();

    const reference = `test_ref_drifted_${hold.bookingId}`;
    await admin.from("bookings").update({ status: "confirmed" }).eq("id", hold.bookingId);
    await admin.from("payments").insert({
      booking_id: hold.bookingId,
      payer_id: parent.userId,
      amount: 15000,
      type: "session_commission",
      gateway: "flutterwave",
      gateway_reference: reference,
      gateway_transaction_id: "9100000003",
      status: "successful",
    });
    trackForCleanup("payments", reference, "gateway_reference");

    flutterwaveMock.listSuccessfulTransactions.mockResolvedValueOnce([]);
    flutterwaveMock.verifyTransaction.mockResolvedValueOnce({
      id: "9100000003",
      txRef: reference,
      status: "failed",
      amountNaira: 15000,
      currency: "NGN",
    });

    const result = await reconcilePayments();
    expect(result.dbRowsChecked).toBeGreaterThanOrEqual(1);
    expect(result.mismatched).toBe(1);
  });

  // BOOK-07, pre-launch audit (P2): the status flip and the payments insert
  // in applyConfirmedBookingEffects aren't one transaction -- if the insert
  // ever failed for a reason other than the already-handled 23505
  // duplicate, the booking stays confirmed with no payments row and
  // nothing ever surfaces it again. This third direction is what does.
  it("flags a confirmed booking that has no successful payment row at all", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist({ priceNaira: 15000 });
    const slot = await createTestSlot(therapist.therapistProfileId);

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

    flutterwaveMock.listSuccessfulTransactions.mockResolvedValueOnce([]);
    const result = await reconcilePayments();
    expect(result.confirmedWithoutPayment).toBeGreaterThanOrEqual(1);
  });

  it("does not flag a confirmed booking that DOES have a successful payment row", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapist = await createTestTherapist({ priceNaira: 15000 });
    const slot = await createTestSlot(therapist.therapistProfileId);

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

    const reference = `test_ref_has_payment_${booking.id}`;
    await admin.from("payments").insert({
      booking_id: booking.id,
      payer_id: parent.userId,
      amount: 15000,
      type: "session_commission",
      gateway_reference: reference,
      status: "successful",
    });
    trackForCleanup("payments", reference, "gateway_reference");

    flutterwaveMock.listSuccessfulTransactions.mockResolvedValueOnce([]);
    const result = await reconcilePayments();
    // Same convention as this file's other exact-count assertions --
    // afterEach's cleanupAll() means no other test in this file leaves a
    // confirmed booking behind for this one to trip over.
    expect(result.confirmedWithoutPayment).toBe(0);
  });
});
