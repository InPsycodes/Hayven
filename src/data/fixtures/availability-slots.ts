import type { AvailabilitySlot, SessionType } from "../types";

function mkSlot(
  id: string,
  therapistId: string,
  date: string,
  startHour: number,
  sessionType: SessionType,
  isBooked = false
): AvailabilitySlot {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    id,
    therapistId,
    startTime: `${date}T${pad(startHour)}:00:00Z`,
    endTime: `${date}T${pad(startHour + 1)}:00:00Z`,
    isBooked,
    sessionType,
  };
}

/**
 * Anchored to the week of 2026-08-03 (Mon) so "today"/"this week" reads as
 * current in the demo. A handful of slots have fixed, hand-picked IDs so
 * bookings.ts can reference them directly; the rest fill out the calendar
 * grid and "next available" panels with open slots.
 */
export const availabilitySlots: AvailabilitySlot[] = [
  // --- thp_amara: fixed slots referenced by bookings ---
  mkSlot("slot_amara_completed", "thp_amara", "2026-07-20", 10, "virtual", true),
  mkSlot("slot_amara_completed_2", "thp_amara", "2026-07-27", 11, "in_person", true),
  mkSlot("slot_amara_upcoming", "thp_amara", "2026-08-04", 10, "virtual", true),
  mkSlot("slot_amara_pending", "thp_amara", "2026-08-07", 9, "in_person", true),
  mkSlot("slot_amara_cancelled", "thp_amara", "2026-07-27", 15, "virtual", true),

  // --- thp_amara: open slots across this week (calendar + booking flow) ---
  mkSlot("slot_amara_mon_11", "thp_amara", "2026-08-03", 11, "virtual"),
  mkSlot("slot_amara_mon_14", "thp_amara", "2026-08-03", 14, "in_person"),
  mkSlot("slot_amara_tue_9", "thp_amara", "2026-08-04", 9, "in_person"),
  mkSlot("slot_amara_tue_13", "thp_amara", "2026-08-04", 13, "virtual"),
  mkSlot("slot_amara_wed_10", "thp_amara", "2026-08-05", 10, "in_person"),
  mkSlot("slot_amara_wed_15", "thp_amara", "2026-08-05", 15, "virtual"),
  mkSlot("slot_amara_thu_9", "thp_amara", "2026-08-06", 9, "virtual"),
  mkSlot("slot_amara_thu_11", "thp_amara", "2026-08-06", 11, "in_person"),
  mkSlot("slot_amara_fri_10", "thp_amara", "2026-08-07", 10, "virtual"),
  mkSlot("slot_amara_fri_14", "thp_amara", "2026-08-07", 14, "in_person"),

  // --- thp_amara: blocked (unavailable) example for the calendar legend ---
  mkSlot("slot_amara_wed_9_blocked", "thp_amara", "2026-08-05", 9, "in_person", true),

  // --- thp_chinedu: fixed slot referenced by a booking ---
  mkSlot("slot_chinedu_upcoming", "thp_chinedu", "2026-08-06", 11, "virtual", true),
  mkSlot("slot_chinedu_completed", "thp_chinedu", "2026-07-15", 16, "in_person", true),

  // --- thp_chinedu: open slots ---
  mkSlot("slot_chinedu_mon_10", "thp_chinedu", "2026-08-03", 10, "virtual"),
  mkSlot("slot_chinedu_wed_16", "thp_chinedu", "2026-08-05", 16, "in_person"),
  mkSlot("slot_chinedu_fri_9", "thp_chinedu", "2026-08-07", 9, "virtual"),

  // --- other verified therapists: a few open slots for browse/profile pages ---
  mkSlot("slot_tunde_tue_10", "thp_tunde", "2026-08-04", 10, "in_person"),
  mkSlot("slot_tunde_thu_14", "thp_tunde", "2026-08-06", 14, "in_person"),
  mkSlot("slot_folake_mon_9", "thp_folake", "2026-08-03", 9, "virtual"),
  mkSlot("slot_folake_wed_13", "thp_folake", "2026-08-05", 13, "virtual"),
  mkSlot("slot_bisi_tue_11", "thp_bisi", "2026-08-04", 11, "virtual"),
  mkSlot("slot_bisi_fri_15", "thp_bisi", "2026-08-07", 15, "in_person"),
];
