import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDiscoveryTherapistById, type DiscoveryTherapist } from "@/lib/therapist/discovery";
import { getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { bookingWindow } from "@/lib/booking/window";
import { recordSessionEarnings } from "@/lib/payouts/earnings";
import { toLagosWallClock } from "@/data/format";
import { getBookedTherapistInfo } from "@/lib/therapist/booked-names";
import type { AvailabilitySlot } from "@/data/types";

/**
 * Transitions confirmed bookings whose slot has already ended to `completed`.
 * Runs opportunistically whenever this therapist's bookings are read, rather
 * than needing a scheduled job -- same pattern as releaseExpiredHolds.
 */
async function autoCompletePastBookings(therapistId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: confirmedBookings } = await admin
    .from("bookings")
    .select("id, availability_slots(end_time)")
    .eq("therapist_id", therapistId)
    .eq("status", "confirmed");
  if (!confirmedBookings || confirmedBookings.length === 0) return;

  const nowMs = Date.now();
  const pastIds = confirmedBookings
    .filter((b) => {
      const slot = b.availability_slots as unknown as { end_time: string } | null;
      return slot && new Date(slot.end_time).getTime() < nowMs;
    })
    .map((b) => b.id);
  if (pastIds.length === 0) return;

  const { data: completed } = await admin
    .from("bookings")
    .update({ status: "completed" })
    .in("id", pastIds)
    .eq("status", "confirmed")
    .select("id");
  await recordSessionEarnings(admin, (completed ?? []).map((b) => b.id));
}

export interface RealBooking {
  id: string;
  parentId: string;
  childId: string;
  childFirstName: string;
  therapistId: string;
  availabilitySlotId: string;
  status: string;
  sessionType: string;
  meetingLink: string | null;
  location: string | null;
  expiresAt: string | null;
  createdAt: string;
  slotStartTime: string;
  slotEndTime: string;
}

/**
 * No-show notes for a set of bookings, keyed by booking id. Its own query
 * (not folded into the main booking select) so a pre-0068 database -- where
 * the column doesn't exist yet -- degrades to "no notes" instead of
 * breaking every bookings list.
 */
export async function getNoShowNotes(bookingIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (bookingIds.length === 0) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, no_show_note")
    .in("id", bookingIds);
  if (error) return out;
  for (const row of data ?? []) out.set(row.id, row.no_show_note ?? null);
  return out;
}

export interface BookingFinancials {
  /** Naira the parent was charged (successful session-commission payment). */
  paidAmount: number | null;
  /** Naira owed back per the cancellation policy; null if not computed. */
  refundAmount: number | null;
}

/**
 * Paid amount + computed refund for a set of bookings. Separate resilient
 * query (like getNoShowNotes) so a pre-0071 database -- no refund_amount
 * column -- still renders every bookings list.
 */
export async function getBookingFinancials(bookingIds: string[]): Promise<Map<string, BookingFinancials>> {
  const out = new Map<string, BookingFinancials>();
  if (bookingIds.length === 0) return out;
  const supabase = await createClient();

  const [{ data: payRows }, { data: bookingRows, error: bookingErr }] = await Promise.all([
    supabase
      .from("payments")
      .select("booking_id, amount, status, type")
      .in("booking_id", bookingIds)
      .eq("status", "successful")
      .eq("type", "session_commission"),
    supabase.from("bookings").select("id, refund_amount").in("id", bookingIds),
  ]);

  const paidBy = new Map<string, number>();
  for (const p of payRows ?? []) if (p.booking_id) paidBy.set(p.booking_id, p.amount);

  const refundBy = new Map<string, number | null>();
  if (!bookingErr) for (const b of bookingRows ?? []) refundBy.set(b.id, b.refund_amount ?? null);

  for (const id of bookingIds) {
    out.set(id, { paidAmount: paidBy.get(id) ?? null, refundAmount: refundBy.get(id) ?? null });
  }
  return out;
}

export async function getRealBookingsForTherapist(therapistId: string): Promise<RealBooking[]> {
  await autoCompletePastBookings(therapistId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, parent_id, child_id, therapist_id, availability_slot_id, status, session_type, meeting_link, location, expires_at, created_at, children(first_name), availability_slots(start_time, end_time)"
    )
    .eq("therapist_id", therapistId);

  if (error || !data) return [];

  return data.map((row) => {
    const child = row.children as unknown as { first_name: string } | null;
    const slot = row.availability_slots as unknown as { start_time: string; end_time: string } | null;
    return {
      id: row.id,
      parentId: row.parent_id,
      childId: row.child_id,
      childFirstName: child?.first_name ?? "Unknown",
      therapistId: row.therapist_id,
      availabilitySlotId: row.availability_slot_id,
      status: row.status,
      sessionType: row.session_type,
      meetingLink: row.meeting_link,
      location: row.location,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      slotStartTime: slot?.start_time ?? "",
      slotEndTime: slot?.end_time ?? "",
    };
  });
}

export interface RealParentBooking extends RealBooking {
  therapistDisplayName: string;
  therapistLocation: string | null;
}

/** All of a parent's bookings, across every child, newest-scheduled first. */
export async function getRealBookingsForParent(parentId: string): Promise<RealParentBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, parent_id, child_id, therapist_id, availability_slot_id, status, session_type, meeting_link, location, expires_at, created_at, children(first_name), availability_slots(start_time, end_time)"
    )
    .eq("parent_id", parentId);

  if (error || !data) return [];

  const bookings: RealBooking[] = data.map((row) => {
    const child = row.children as unknown as { first_name: string } | null;
    const slot = row.availability_slots as unknown as { start_time: string; end_time: string } | null;
    return {
      id: row.id,
      parentId: row.parent_id,
      childId: row.child_id,
      childFirstName: child?.first_name ?? "Unknown",
      therapistId: row.therapist_id,
      availabilitySlotId: row.availability_slot_id,
      status: row.status,
      sessionType: row.session_type,
      meetingLink: row.meeting_link,
      location: row.location,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      slotStartTime: slot?.start_time ?? "",
      slotEndTime: slot?.end_time ?? "",
    };
  });

  const therapistById = await getBookedTherapistInfo([...new Set(bookings.map((b) => b.therapistId))]);

  return bookings
    .map((b) => {
      const therapist = therapistById.get(b.therapistId);
      return {
        ...b,
        therapistDisplayName: therapist?.displayName ?? "Your therapist",
        therapistLocation: therapist?.location ?? null,
      };
    })
    .sort((a, b) => b.slotStartTime.localeCompare(a.slotStartTime));
}

export interface RealNextSession {
  sessionType: string;
  location: string | null;
  slotStartTime: string;
  therapistDisplayName: string;
  therapistLocation: string | null;
}

/** Powers the parent dashboard's "Next session" card for a given child. */
export async function getRealNextUpcomingBookingForChild(childId: string): Promise<RealNextSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("session_type, location, therapist_id, availability_slots(start_time)")
    .eq("child_id", childId)
    .eq("status", "confirmed");
  if (error || !data) return null;

  const nowMs = Date.now();
  const upcoming = data
    .map((row) => ({
      sessionType: row.session_type as string,
      location: row.location as string | null,
      therapistId: row.therapist_id as string,
      slotStartTime:
        (row.availability_slots as unknown as { start_time: string } | null)?.start_time ?? "",
    }))
    .filter((row) => row.slotStartTime && new Date(row.slotStartTime).getTime() >= nowMs)
    .sort((a, b) => a.slotStartTime.localeCompare(b.slotStartTime));

  const next = upcoming[0];
  if (!next) return null;

  const therapistPublic = (await getBookedTherapistInfo([next.therapistId])).get(next.therapistId);

  return {
    sessionType: next.sessionType,
    location: next.location,
    slotStartTime: next.slotStartTime,
    therapistDisplayName: therapistPublic?.displayName ?? "Your therapist",
    therapistLocation: therapistPublic?.location ?? null,
  };
}

export interface RealTodayBooking {
  id: string;
  sessionType: string;
  location: string | null;
  slotStartTime: string;
  childFirstName: string;
}

/** Powers the therapist dashboard's "Today's schedule" list. */
/** "Today" is always the Lagos calendar day, not the server's -- computed here rather than passed in, so callers can't each get the boundary wrong near midnight. */
/**
 * Wrapped in cache(): both the therapist dashboard page and AppShell (for
 * the sidebar's today's-session-count badge) call this with the same
 * therapistId within one request -- see src/lib/messages/queries.ts for the
 * same pattern.
 */
export const getRealTodaysBookingsForTherapist = cache(async function getRealTodaysBookingsForTherapist(
  therapistId: string
): Promise<RealTodayBooking[]> {
  await autoCompletePastBookings(therapistId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, session_type, location, children(first_name), availability_slots(start_time)")
    .eq("therapist_id", therapistId)
    .in("status", ["confirmed", "completed"]);
  if (error || !data) return [];

  const todayISODate = toLagosWallClock(new Date()).toISOString().slice(0, 10);

  return data
    .map((row) => {
      const child = row.children as unknown as { first_name: string } | null;
      const slot = row.availability_slots as unknown as { start_time: string } | null;
      return {
        id: row.id,
        sessionType: row.session_type,
        location: row.location,
        slotStartTime: slot?.start_time ?? "",
        childFirstName: child?.first_name ?? "Unknown",
      };
    })
    .filter((b) => b.slotStartTime && toLagosWallClock(new Date(b.slotStartTime)).toISOString().startsWith(todayISODate))
    .sort((a, b) => a.slotStartTime.localeCompare(b.slotStartTime));
});

/**
 * Distinct children this therapist has had a non-cancelled booking with.
 * Wrapped in cache(): both the therapist dashboard page and AppShell (for
 * the sidebar's caseload-count badge) call this with the same therapistId
 * within one request -- see src/lib/messages/queries.ts for the same pattern.
 */
export const getRealActiveClientCountForTherapist = cache(async function getRealActiveClientCountForTherapist(therapistId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("child_id")
    .eq("therapist_id", therapistId)
    .neq("status", "cancelled");
  if (error || !data) return 0;
  return new Set(data.map((r) => r.child_id)).size;
});

/** Sum of successful session-commission payments to this therapist this calendar month. */
export async function getRealEarningsForTherapist(therapistUserId: string): Promise<number> {
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("payee_id", therapistUserId)
    .eq("type", "session_commission")
    .eq("status", "successful")
    .gte("created_at", startOfMonth.toISOString());
  if (error || !data) return 0;
  return data.reduce((sum, p) => sum + p.amount, 0);
}

/** Lightweight status check for the confirmation page -- avoids trusting optimistic client state for whether a payment actually landed. */
export async function getRealBookingStatus(
  bookingId: string
): Promise<{ status: string; hasSuccessfulPayment: boolean } | null> {
  const supabase = await createClient();
  const [{ data: booking }, { data: payment }] = await Promise.all([
    supabase.from("bookings").select("status").eq("id", bookingId).maybeSingle(),
    // Lets the confirmation page (E2, external PRD review) tell "the hold
    // expired before you ever paid" apart from "you paid, but the hold
    // expired first and the charge is being refunded" -- both land on
    // booking.status === "cancelled", and only one of them should say
    // "you'll be refunded."
    supabase
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("status", "successful")
      .eq("type", "session_commission")
      .maybeSingle(),
  ]);
  if (!booking) return null;
  return { status: booking.status, hasSuccessfulPayment: !!payment };
}

export interface BookingPageContext {
  therapist: DiscoveryTherapist;
  slots: AvailabilitySlot[];
  kids: { id: string; firstName: string }[];
}

/** Shared context for the 3-step booking flow pages (time/payment/confirmation). */
export async function getBookingPageContext(
  therapistId: string,
  parentId: string
): Promise<BookingPageContext | null> {
  const therapist = await getDiscoveryTherapistById(therapistId);
  if (!therapist) return null;

  // Scoped to now → +60 days so the flow never offers a slot in the past.
  const window = bookingWindow();
  const [slotRows, realChildren] = await Promise.all([
    getRealAvailabilityForTherapist(therapistId, window),
    getRealChildrenForParent(parentId),
  ]);
  const slots: AvailabilitySlot[] = slotRows.map((slot) => ({
    id: slot.id,
    therapistId: slot.therapistId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
    sessionType: slot.sessionType as AvailabilitySlot["sessionType"],
  }));

  const kids = realChildren.map((c) => ({ id: c.id, firstName: c.firstName }));

  return { therapist, slots, kids };
}
