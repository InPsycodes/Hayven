import type { AvailabilitySlot, SessionType } from "../types";
import { fxDate } from "./_clock";

// Africa/Lagos is UTC+1 year-round (no DST), so an hour typed as Lagos wall
// clock time converts to true UTC by subtracting 1 -- matches the real
// conversion in src/lib/therapist/actions.ts's addAvailabilitySlot.
const LAGOS_OFFSET_HOURS = 1;

function mkSlot(
  id: string,
  therapistId: string,
  dayOffset: number,
  startHourLagos: number,
  sessionType: SessionType,
  isBooked = false
): AvailabilitySlot {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const date = fxDate(dayOffset);
  const startUtcHour = startHourLagos - LAGOS_OFFSET_HOURS;
  const endUtcHour = startHourLagos + 1 - LAGOS_OFFSET_HOURS;
  return {
    id,
    therapistId,
    startTime: `${date}T${pad(startUtcHour)}:00:00Z`,
    endTime: `${date}T${pad(endUtcHour)}:00:00Z`,
    isBooked,
    sessionType,
  };
}

/**
 * Day offsets are from *this week's* Monday (see ./_clock), so the demo
 * calendar always reads as current. Negative = history (backs completed /
 * cancelled bookings); the open slots start mid-week and run into next week
 * so there's always something bookable inside the booking flow's 60-day
 * window regardless of which day this is viewed.
 */
export const availabilitySlots: AvailabilitySlot[] = [
  // --- thp_amara: fixed slots referenced by bookings ---
  mkSlot("slot_amara_completed", "thp_amara", -14, 10, "virtual", true),
  mkSlot("slot_amara_completed_2", "thp_amara", -7, 11, "in_person", true),
  mkSlot("slot_amara_upcoming", "thp_amara", 8, 10, "virtual", true),
  mkSlot("slot_amara_pending", "thp_amara", 11, 9, "in_person", true),
  mkSlot("slot_amara_cancelled", "thp_amara", -7, 15, "virtual", true),

  // --- thp_amara: open slots (calendar + booking flow) ---
  mkSlot("slot_amara_mon_11", "thp_amara", 7, 11, "virtual"),
  mkSlot("slot_amara_mon_14", "thp_amara", 7, 14, "in_person"),
  mkSlot("slot_amara_tue_9", "thp_amara", 8, 9, "in_person"),
  mkSlot("slot_amara_tue_13", "thp_amara", 8, 13, "virtual"),
  mkSlot("slot_amara_wed_10", "thp_amara", 9, 10, "in_person"),
  mkSlot("slot_amara_wed_15", "thp_amara", 9, 15, "virtual"),
  mkSlot("slot_amara_thu_9", "thp_amara", 10, 9, "virtual"),
  mkSlot("slot_amara_thu_11", "thp_amara", 10, 11, "in_person"),
  mkSlot("slot_amara_fri_10", "thp_amara", 11, 10, "virtual"),
  mkSlot("slot_amara_fri_14", "thp_amara", 11, 14, "in_person"),
  mkSlot("slot_amara_nextmon_10", "thp_amara", 14, 10, "virtual"),
  mkSlot("slot_amara_nextwed_13", "thp_amara", 16, 13, "in_person"),

  // --- thp_amara: blocked (unavailable) example for the calendar legend ---
  mkSlot("slot_amara_wed_9_blocked", "thp_amara", 9, 9, "in_person", true),

  // --- thp_chinedu: fixed slots referenced by bookings ---
  mkSlot("slot_chinedu_upcoming", "thp_chinedu", 10, 11, "virtual", true),
  mkSlot("slot_chinedu_completed", "thp_chinedu", -19, 16, "in_person", true),

  // --- thp_chinedu: open slots ---
  mkSlot("slot_chinedu_mon_10", "thp_chinedu", 7, 10, "virtual"),
  mkSlot("slot_chinedu_wed_16", "thp_chinedu", 9, 16, "in_person"),
  mkSlot("slot_chinedu_fri_9", "thp_chinedu", 11, 9, "virtual"),
  mkSlot("slot_chinedu_nexttue_14", "thp_chinedu", 15, 14, "virtual"),

  // --- other verified therapists: open slots for browse/profile pages ---
  mkSlot("slot_tunde_tue_10", "thp_tunde", 8, 10, "in_person"),
  mkSlot("slot_tunde_thu_14", "thp_tunde", 10, 14, "in_person"),
  mkSlot("slot_tunde_nextmon_11", "thp_tunde", 14, 11, "in_person"),
  mkSlot("slot_folake_mon_9", "thp_folake", 7, 9, "virtual"),
  mkSlot("slot_folake_wed_13", "thp_folake", 9, 13, "virtual"),
  mkSlot("slot_folake_nextthu_10", "thp_folake", 17, 10, "virtual"),
  mkSlot("slot_bisi_tue_11", "thp_bisi", 8, 11, "virtual"),
  mkSlot("slot_bisi_fri_15", "thp_bisi", 11, 15, "in_person"),
  mkSlot("slot_bisi_nextwed_9", "thp_bisi", 16, 9, "in_person"),
];
