import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailabilityForTherapist } from "@/data/queries";
import { getDiscoveryTherapistById, type DiscoveryTherapist } from "@/lib/therapist/discovery";
import { getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { getRealChildrenForParent } from "@/lib/parent/queries";
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

  await admin.from("bookings").update({ status: "completed" }).in("id", pastIds).eq("status", "confirmed");
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

  const { data: therapistPublic } = await supabase
    .from("therapist_public_profiles")
    .select("display_name, location")
    .eq("id", next.therapistId)
    .maybeSingle();

  return {
    sessionType: next.sessionType,
    location: next.location,
    slotStartTime: next.slotStartTime,
    therapistDisplayName: therapistPublic?.display_name ?? "Your therapist",
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
export async function getRealTodaysBookingsForTherapist(
  therapistId: string,
  todayISODate: string
): Promise<RealTodayBooking[]> {
  await autoCompletePastBookings(therapistId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, session_type, location, children(first_name), availability_slots(start_time)")
    .eq("therapist_id", therapistId)
    .in("status", ["confirmed", "completed"]);
  if (error || !data) return [];

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
    .filter((b) => b.slotStartTime.startsWith(todayISODate))
    .sort((a, b) => a.slotStartTime.localeCompare(b.slotStartTime));
}

/** Distinct children this therapist has had a non-cancelled booking with. */
export async function getRealActiveClientCountForTherapist(therapistId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("child_id")
    .eq("therapist_id", therapistId)
    .neq("status", "cancelled");
  if (error || !data) return 0;
  return new Set(data.map((r) => r.child_id)).size;
}

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

export interface RealReportDueBooking {
  id: string;
  childFirstName: string;
  slotStartTime: string;
}

/** Completed sessions with no session note written yet. */
export async function getRealReportsDueForTherapist(therapistId: string): Promise<RealReportDueBooking[]> {
  const supabase = await createClient();
  const [{ data: completedBookings }, { data: notes }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, children(first_name), availability_slots(start_time)")
      .eq("therapist_id", therapistId)
      .eq("status", "completed"),
    supabase.from("session_notes").select("booking_id").eq("therapist_id", therapistId),
  ]);
  if (!completedBookings) return [];

  const bookingIdsWithNotes = new Set((notes ?? []).map((n) => n.booking_id));

  return completedBookings
    .filter((b) => !bookingIdsWithNotes.has(b.id))
    .map((b) => {
      const child = b.children as unknown as { first_name: string } | null;
      const slot = b.availability_slots as unknown as { start_time: string } | null;
      return {
        id: b.id,
        childFirstName: child?.first_name ?? "Unknown",
        slotStartTime: slot?.start_time ?? "",
      };
    });
}

/** Lightweight status check for the confirmation page -- avoids trusting optimistic client state for whether a payment actually landed. */
export async function getRealBookingStatus(bookingId: string): Promise<{ status: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("status").eq("id", bookingId).maybeSingle();
  return data ?? null;
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

  const [slots, realChildren] = await Promise.all([
    therapist.source === "real"
      ? getRealAvailabilityForTherapist(therapistId).then((rows) =>
          rows.map((slot) => ({
            id: slot.id,
            therapistId: slot.therapistId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: slot.isBooked,
            sessionType: slot.sessionType as AvailabilitySlot["sessionType"],
          }))
        )
      : getAvailabilityForTherapist(therapistId),
    getRealChildrenForParent(parentId),
  ]);

  const kids = realChildren.map((c) => ({ id: c.id, firstName: c.firstName }));

  return { therapist, slots, kids };
}
