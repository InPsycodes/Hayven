import "server-only";

import { getRealVerifiedTherapists, getRealTherapistById } from "./queries";
import type { SessionType } from "@/data/types";

/**
 * Public-discovery shape for a verified therapist, drawn entirely from
 * Supabase (`therapist_public_profiles`). The demo/mock therapist layer was
 * removed ahead of the pilot -- every profile here is a real, admin-verified
 * therapist who set their own availability, so the booking flow always has a
 * real booking row and real Paystack checkout behind it.
 */
export interface DiscoveryTherapist {
  id: string;
  displayName: string;
  bio: string;
  specialtyNames: string[];
  location: string;
  sessionTypes: SessionType[];
  pricePerSession: number;
  yearsPracticing: number;
  verifiedBadgeLabel: string;
  ageGroupsServed: string[];
}

export interface DiscoveryFilters {
  specialtyName?: string;
  location?: string;
  sessionType?: SessionType;
  priceMax?: number;
  query?: string;
}

function matchesFilters(t: DiscoveryTherapist, filters: DiscoveryFilters): boolean {
  if (filters.specialtyName && !t.specialtyNames.includes(filters.specialtyName)) return false;
  if (filters.sessionType && !t.sessionTypes.includes(filters.sessionType)) return false;
  if (filters.priceMax && t.pricePerSession > filters.priceMax) return false;
  if (filters.location && !t.location.toLowerCase().includes(filters.location.toLowerCase()))
    return false;
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const haystack = `${t.displayName} ${t.bio} ${t.specialtyNames.join(" ")}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export async function searchDiscoveryTherapists(
  filters: DiscoveryFilters = {}
): Promise<DiscoveryTherapist[]> {
  const results = await getRealVerifiedTherapists();

  return results
    .map((t) => ({
      id: t.id,
      displayName: t.displayName,
      bio: t.bio ?? "",
      specialtyNames: t.specialtyNames,
      location: t.location ?? "",
      sessionTypes: (t.sessionTypes as SessionType[]) ?? [],
      pricePerSession: t.pricePerSession,
      yearsPracticing: t.yearsPracticing ?? 0,
      verifiedBadgeLabel: t.verifiedBadgeLabel ?? "Verified",
      ageGroupsServed: [] as string[],
    }))
    .filter((t) => matchesFilters(t, filters));
}

export async function getDiscoveryTherapistById(id: string): Promise<DiscoveryTherapist | undefined> {
  const match = await getRealTherapistById(id);
  if (!match) return undefined;

  return {
    id: match.id,
    displayName: match.displayName,
    bio: match.bio ?? "",
    specialtyNames: match.specialtyNames,
    location: match.location ?? "",
    sessionTypes: (match.sessionTypes as SessionType[]) ?? [],
    pricePerSession: match.pricePerSession,
    yearsPracticing: match.yearsPracticing ?? 0,
    verifiedBadgeLabel: match.verifiedBadgeLabel ?? "Verified",
    ageGroupsServed: [],
  };
}
