/**
 * Shared domain types, camelCase mirrors of the Postgres model. Trimmed to
 * what's actually imported after the mock-data layer was removed -- the
 * full set of entity interfaces lived alongside the fixtures (src/data/
 * fixtures/, now deleted). Add a type back here only when a real code path
 * needs it.
 */

export type UserRole = "parent" | "therapist" | "admin" | "supervisor";

export type SessionType = "in_person" | "virtual";

export interface Specialty {
  id: string;
  name: string;
  governingBody?: string;
}

export interface AvailabilitySlot {
  id: string;
  therapistId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  sessionType: SessionType;
}
