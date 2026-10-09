import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface BookedTherapistInfo {
  displayName: string;
  location: string | null;
}

/**
 * Name and location of therapists a parent already has bookings with.
 *
 * Not the discovery view: therapist_public_profiles drops a therapist the
 * moment they stop being bookable (suspended, no availability, insurance
 * lapsed -- 0092/0076/0106), and a parent's existing bookings and message
 * threads then showed "Therapist" instead of the person they've been
 * working with. Service-role read, so callers must pass ids taken from the
 * parent's own bookings, fetched through the RLS-bound client -- that's
 * what scopes this to people the parent already has a relationship with.
 */
export async function getBookedTherapistInfo(therapistIds: string[]): Promise<Map<string, BookedTherapistInfo>> {
  const result = new Map<string, BookedTherapistInfo>();
  if (therapistIds.length === 0) return result;

  const { data } = await createAdminClient()
    .from("therapist_profiles")
    .select("id, location, users(full_name)")
    .in("id", therapistIds);
  for (const row of data ?? []) {
    const name = (row.users as unknown as { full_name: string } | null)?.full_name;
    if (name) result.set(row.id, { displayName: name, location: row.location });
  }
  return result;
}
