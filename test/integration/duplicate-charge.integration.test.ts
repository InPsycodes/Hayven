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
} from "./helpers";
import { createPendingBooking, finalizeBookingPayment } from "@/lib/booking/actions";
import { getBookingsNeedingRefund } from "@/lib/admin/queries";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// BOOK-01 regression (pre-launch audit, P0): initiatePaystackPayment's
// payment-init lock used to expire (5 min) well inside the 15-minute
// booking hold, so a parent who retried a stalled checkout could get a
// second, genuinely different Paystack reference for the same booking. If
// both got paid, finalizeBookingPayment's "booking is already confirmed"
// check used to treat that as proof the SECOND charge was accounted for
// too, silently dropping it -- no payments row, no refund, no alert.
describe("BOOK-01 regression: a second real charge on a confirmed booking is never dropped", () => {
  it("records, refunds, and surfaces a duplicate charge instead of silently discarding it", async () => {
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

    const reference1 = `test_book01_first_${hold.bookingId}`;
    const reference2 = `test_book01_retry_${hold.bookingId}`;
    trackForCleanup("payments", reference1, "gateway_reference");
    trackForCleanup("payments", reference2, "gateway_reference");

    const first = await finalizeBookingPayment(hold.bookingId, reference1, 1500000);
    expect(first.ok).toBe(true);

    const { data: bookingAfterFirst } = await admin.from("bookings").select("status").eq("id", hold.bookingId).single();
    expect(bookingAfterFirst?.status).toBe("confirmed");

    // The retried checkout's second, genuinely different Paystack reference
    // lands after the booking is already confirmed.
    const second = await finalizeBookingPayment(hold.bookingId, reference2, 1500000);
    expect(second.ok).toBe(false); // no longer silently swallowed

    // The booking itself stays confirmed -- it's a real, legitimate booking,
    // just double-charged. Cancelling it would be the wrong fix.
    const { data: bookingAfterSecond } = await admin.from("bookings").select("status").eq("id", hold.bookingId).single();
    expect(bookingAfterSecond?.status).toBe("confirmed");

    const { data: payments } = await admin
      .from("payments")
      .select("gateway_reference, status, amount")
      .eq("booking_id", hold.bookingId)
      .order("created_at", { ascending: true });
    expect(payments).toHaveLength(2);
    expect(payments?.[0].gateway_reference).toBe(reference1);
    expect(payments?.[1].gateway_reference).toBe(reference2);
    expect(payments?.every((p) => p.status === "successful")).toBe(true);

    const queue = await getBookingsNeedingRefund();
    const duplicateEntry = queue.find((r) => r.gatewayReference === reference2);
    expect(duplicateEntry).toBeTruthy();
    expect(duplicateEntry?.refundAmount).toBe(15000);
    expect(duplicateEntry?.cancellationReason).toBe("duplicate_charge");

    // The FIRST, legitimate charge must never appear as something owed back.
    expect(queue.find((r) => r.gatewayReference === reference1)).toBeUndefined();
  });

  it("still treats a genuine same-reference retry as already handled, not a duplicate", async () => {
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

    const reference = `test_book01_same_ref_${hold.bookingId}`;
    trackForCleanup("payments", reference, "gateway_reference");

    // Simulates the webhook and the redirect-callback path racing on the
    // SAME reference -- one wins the status flip, the other calls
    // finalizeBookingPayment again with the identical reference.
    const [a, b] = await Promise.all([
      finalizeBookingPayment(hold.bookingId, reference, 1500000),
      finalizeBookingPayment(hold.bookingId, reference, 1500000),
    ]);
    expect([a.ok, b.ok]).toContain(true);

    const { data: payments } = await admin.from("payments").select("id").eq("booking_id", hold.bookingId);
    expect(payments).toHaveLength(1);

    const queue = await getBookingsNeedingRefund();
    expect(queue.find((r) => r.bookingId === hold.bookingId)).toBeUndefined();
  });
});
