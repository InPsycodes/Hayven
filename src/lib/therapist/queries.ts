import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Specialty } from "@/data/types";

/** Real specialties from Supabase (seeded, unlike the rest of the still-mock data layer). */
export async function getRealSpecialties(): Promise<Specialty[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("specialties").select("id, name, governing_body");
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    governingBody: row.governing_body ?? undefined,
  }));
}

export interface RealTherapistProfile {
  id: string;
  userId: string;
  bio: string | null;
  location: string | null;
  sessionTypes: string[];
  pricePerSession: number;
  yearsPracticing: number | null;
  verificationStatus: string;
  verifiedBadgeLabel: string | null;
  reportTone: "warm" | "direct";
}

/**
 * Real therapist_profiles lookup by auth user id -- null if they haven't
 * started/finished onboarding. Wrapped in cache(): both the therapist
 * dashboard page and AppShell (for sidebar badge counts) call this with the
 * same userId within one request -- see src/lib/messages/queries.ts for the
 * same pattern.
 */
export const getRealTherapistProfileByUserId = cache(async function getRealTherapistProfileByUserId(
  userId: string
): Promise<RealTherapistProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("therapist_profiles")
    .select(
      "id, user_id, bio, location, session_types, price_per_session, years_practicing, verification_status, verified_badge_label, report_tone"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    bio: data.bio,
    location: data.location,
    sessionTypes: data.session_types ?? [],
    pricePerSession: data.price_per_session,
    yearsPracticing: data.years_practicing,
    verificationStatus: data.verification_status,
    verifiedBadgeLabel: data.verified_badge_label,
    reportTone: data.report_tone === "direct" ? "direct" : "warm",
  };
});

export interface RealPublicTherapist {
  id: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  sessionTypes: string[];
  pricePerSession: number;
  yearsPracticing: number | null;
  verifiedBadgeLabel: string | null;
  specialtyNames: string[];
}

/** Public discovery: verified therapists only, via the therapist_public_profiles view. */
export async function getRealVerifiedTherapists(): Promise<RealPublicTherapist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("therapist_public_profiles").select("*");
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    location: row.location,
    sessionTypes: row.session_types ?? [],
    pricePerSession: row.price_per_session,
    yearsPracticing: row.years_practicing,
    verifiedBadgeLabel: row.verified_badge_label,
    specialtyNames: row.specialty_names ?? [],
  }));
}

export interface RealAvailabilitySlot {
  id: string;
  therapistId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  sessionType: string;
}

/**
 * Releases pending_payment bookings whose 15-minute hold has expired
 * (abandoned checkout), freeing the slot back to available. Runs opportunistically
 * whenever this therapist's availability is read, rather than needing a cron job.
 */
async function releaseExpiredHolds(therapistId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: expired } = await admin
    .from("bookings")
    .select("id, availability_slot_id")
    .eq("therapist_id", therapistId)
    .eq("status", "pending_payment")
    .lt("expires_at", new Date().toISOString());

  if (!expired || expired.length === 0) return;

  await Promise.all(
    expired.map(async (booking) => {
      const { data: cancelled } = await admin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id)
        .eq("status", "pending_payment")
        .select("id")
        .maybeSingle();
      if (cancelled) {
        await admin.from("availability_slots").update({ is_booked: false }).eq("id", booking.availability_slot_id);
      }
    })
  );
}

export async function getRealAvailabilityForTherapist(
  therapistId: string,
  range?: { from: string; to: string }
): Promise<RealAvailabilitySlot[]> {
  await releaseExpiredHolds(therapistId);
  const supabase = await createClient();
  let query = supabase
    .from("availability_slots")
    .select("id, therapist_id, start_time, end_time, is_booked, session_type")
    .eq("therapist_id", therapistId)
    .order("start_time", { ascending: true });

  if (range) {
    query = query.gte("start_time", range.from).lte("start_time", range.to);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    therapistId: row.therapist_id,
    startTime: row.start_time,
    endTime: row.end_time,
    isBooked: row.is_booked,
    sessionType: row.session_type,
  }));
}

export async function getRealTherapistById(id: string): Promise<RealPublicTherapist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("therapist_public_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    bio: data.bio,
    location: data.location,
    sessionTypes: data.session_types ?? [],
    pricePerSession: data.price_per_session,
    yearsPracticing: data.years_practicing,
    verifiedBadgeLabel: data.verified_badge_label,
    specialtyNames: data.specialty_names ?? [],
  };
}

export interface RealSupervisorRequestStatus {
  id: string;
  status: string;
  requestedAt: string;
}

/** Most recent supervisor-access request this therapist submitted, if any -- see migration 0054. */
export async function getMySupervisorRequestStatus(userId: string): Promise<RealSupervisorRequestStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisor_requests")
    .select("id, status, requested_at")
    .eq("therapist_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  return { id: data.id, status: data.status, requestedAt: data.requested_at };
}
