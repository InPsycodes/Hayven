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
import { confirmFlutterwavePayment } from "@/lib/payments/confirm";
import { getRealAvailabilityForTherapist } from "@/lib/therapist/queries";

const admin = testAdminClient;
const PRICE = 15000;

beforeEach(() => {
  flutterwaveMock.verifyTransaction.mockClear();
});

afterEach(async () => {
  signOut();
  await cleanupAll();
});

/** A parent holding a slot at checkout: the booking is pending_payment. */
async function heldBooking() {
  const parent = await createTestParent();
  const child = await createTestChild(parent.userId);
  const therapist = await createTestTherapist({ priceNaira: PRICE });
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
  return { parent, therapist, slot, bookingId: hold.bookingId, reference: `hv_${hold.bookingId}_1` };
}

async function state(bookingId: string, slotId: string) {
  const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
  const { data: slot } = await admin.from("availability_slots").select("is_booked").eq("id", slotId).single();
  const { data: payments } = await admin.from("payments").select("id").eq("booking_id", bookingId);
  return { status: booking?.status, slotBooked: slot?.is_booked, payments: payments?.length ?? 0 };
}

/**
 * confirmFlutterwavePayment is the single path the webhook, the redirect
 * back from checkout and the reconciliation sweep all use. These pin what it
 * must refuse -- whatever Flutterwave's verify call says -- so a booking can
 * never be confirmed by a payment that didn't really cover it.
 */
describe("payment edge cases: what a confirmation must refuse", () => {
  const refusals: [string, Record<string, unknown>, RegExp][] = [
    ["a declined card", { status: "failed" }, /failed/],
    ["a payment still pending at Flutterwave", { status: "pending" }, /pending/],
    ["a payment in the wrong currency", { currency: "USD" }, /naira/],
    ["a payment smaller than the session price", { amountNaira: PRICE - 1 }, /less than/],
  ];

  for (const [label, override, error] of refusals) {
    it(`refuses ${label}, leaving the hold and taking no money record`, async () => {
      const { bookingId, reference, slot } = await heldBooking();
      flutterwaveMock.verifyTransaction.mockResolvedValueOnce({
        id: "9200000001",
        txRef: reference,
        status: "successful",
        amountNaira: PRICE,
        currency: "NGN",
        ...override,
      });

      const result = await confirmFlutterwavePayment("9200000001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(error);
      expect(await state(bookingId, slot.id)).toEqual({ status: "pending_payment", slotBooked: true, payments: 0 });
    });
  }

  it("refuses a successful payment whose reference isn't a Hayven booking", async () => {
    flutterwaveMock.verifyTransaction.mockResolvedValueOnce({
      id: "9200000002",
      txRef: "someone-elses-shop-123",
      status: "successful",
      amountNaira: PRICE,
      currency: "NGN",
    });
    const result = await confirmFlutterwavePayment("9200000002");
    expect(result).toEqual({ ok: false, error: "Not a Hayven booking payment." });
  });

  it("refuses when Flutterwave can't be reached to verify, rather than trusting the caller", async () => {
    const { bookingId, slot } = await heldBooking();
    flutterwaveMock.verifyTransaction.mockRejectedValueOnce(new Error("Flutterwave verify timed out"));
    const result = await confirmFlutterwavePayment("9200000003");
    expect(result.ok).toBe(false);
    expect(await state(bookingId, slot.id)).toEqual({ status: "pending_payment", slotBooked: true, payments: 0 });
  });
});

describe("payment edge cases: the same payment arriving twice", () => {
  const paid = (reference: string) => ({
    id: "9300000001",
    txRef: reference,
    status: "successful",
    amountNaira: PRICE,
    currency: "NGN",
  });

  it("webhook first, then the parent's redirect: confirmed once, one payment record", async () => {
    const { bookingId, reference, slot } = await heldBooking();
    trackForCleanup("payments", reference, "gateway_reference");
    flutterwaveMock.verifyTransaction.mockResolvedValue(paid(reference));

    const webhook = await confirmFlutterwavePayment("9300000001");
    const redirect = await confirmFlutterwavePayment("9300000001");

    expect(webhook.ok).toBe(true);
    expect(redirect.ok).toBe(true);
    expect(await state(bookingId, slot.id)).toEqual({ status: "confirmed", slotBooked: true, payments: 1 });
  });

  it("webhook and redirect at the same moment: still confirmed once, one payment record", async () => {
    const { bookingId, reference, slot } = await heldBooking();
    trackForCleanup("payments", reference, "gateway_reference");
    flutterwaveMock.verifyTransaction.mockResolvedValue(paid(reference));

    const results = await Promise.all([confirmFlutterwavePayment("9300000001"), confirmFlutterwavePayment("9300000001")]);

    expect(results.every((r) => r.ok)).toBe(true);
    expect(await state(bookingId, slot.id)).toEqual({ status: "confirmed", slotBooked: true, payments: 1 });
  });

  it("a payment for more than the price still confirms, recording what was actually paid", async () => {
    const { bookingId, reference, slot } = await heldBooking();
    trackForCleanup("payments", reference, "gateway_reference");
    flutterwaveMock.verifyTransaction.mockResolvedValueOnce({ ...paid(reference), amountNaira: PRICE + 500 });

    expect((await confirmFlutterwavePayment("9300000001")).ok).toBe(true);
    const { data } = await admin.from("payments").select("amount").eq("booking_id", bookingId).single();
    expect(data?.amount).toBe(PRICE + 500);
    expect((await state(bookingId, slot.id)).status).toBe("confirmed");
  });
});

describe("payment edge cases: abandoned checkout", () => {
  it("frees the slot once the 15-minute hold has expired and someone views that therapist's times", async () => {
    const { bookingId, therapist, slot, parent } = await heldBooking();
    await admin
      .from("bookings")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", bookingId);

    await signInAs(parent);
    const slots = await getRealAvailabilityForTherapist(therapist.therapistProfileId);

    expect(slots.find((s) => s.id === slot.id)?.isBooked).toBe(false);
    expect(await state(bookingId, slot.id)).toEqual({ status: "cancelled", slotBooked: false, payments: 0 });
  });

  it("does not free a hold that is still inside its 15 minutes", async () => {
    const { bookingId, therapist, slot, parent } = await heldBooking();
    await signInAs(parent);
    await getRealAvailabilityForTherapist(therapist.therapistProfileId);
    expect(await state(bookingId, slot.id)).toEqual({ status: "pending_payment", slotBooked: true, payments: 0 });
  });
});
