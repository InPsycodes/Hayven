import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAvailabilityForTherapist } from "@/data/queries";
import { getDiscoveryTherapistById, type DiscoveryTherapist } from "@/lib/therapist/discovery";
import { getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import type { AvailabilitySlot } from "@/data/types";

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
