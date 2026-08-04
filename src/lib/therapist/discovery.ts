import "server-only";

import { getTherapists, getTherapistById } from "@/data/queries";
import { getRealVerifiedTherapists, getRealTherapistById } from "./queries";
import type { SessionType } from "@/data/types";

/**
 * Unified shape for public discovery, merging the still-mock demo
 * therapists with real verified ones from Supabase. Mock therapists are
 * untouched (existing demo/booking flow keeps working); real ones are
 * added alongside. Specialty *names* are the shared key across both
 * sources, since mock fixtures and real seeded specialties use different
 * ID spaces but the same canonical names.
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
  source: "mock" | "real";
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
  const [mockResults, realResults] = await Promise.all([
    getTherapists(),
    getRealVerifiedTherapists(),
  ]);

  const mockAdapted: DiscoveryTherapist[] = mockResults.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    bio: t.bio,
    specialtyNames: t.specialties.map((s) => s.name),
    location: t.location,
    sessionTypes: t.sessionTypes,
    pricePerSession: t.pricePerSession,
    yearsPracticing: t.yearsPracticing,
    verifiedBadgeLabel: t.verifiedBadgeLabel ?? "Verified",
    ageGroupsServed: t.ageGroupsServed,
    source: "mock" as const,
  }));

  const realAdapted: DiscoveryTherapist[] = realResults.map((t) => ({
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
    source: "real" as const,
  }));

  return [...mockAdapted, ...realAdapted].filter((t) => matchesFilters(t, filters));
}

export async function getDiscoveryTherapistById(
  id: string
): Promise<DiscoveryTherapist | undefined> {
  const mockMatch = await getTherapistById(id);
  if (mockMatch && mockMatch.verificationStatus === "verified") {
    return {
      id: mockMatch.id,
      displayName: mockMatch.displayName,
      bio: mockMatch.bio,
      specialtyNames: mockMatch.specialties.map((s) => s.name),
      location: mockMatch.location,
      sessionTypes: mockMatch.sessionTypes,
      pricePerSession: mockMatch.pricePerSession,
      yearsPracticing: mockMatch.yearsPracticing,
      verifiedBadgeLabel: mockMatch.verifiedBadgeLabel ?? "Verified",
      ageGroupsServed: mockMatch.ageGroupsServed,
      source: "mock",
    };
  }

  const realMatch = await getRealTherapistById(id);
  if (realMatch) {
    return {
      id: realMatch.id,
      displayName: realMatch.displayName,
      bio: realMatch.bio ?? "",
      specialtyNames: realMatch.specialtyNames,
      location: realMatch.location ?? "",
      sessionTypes: (realMatch.sessionTypes as SessionType[]) ?? [],
      pricePerSession: realMatch.pricePerSession,
      yearsPracticing: realMatch.yearsPracticing ?? 0,
      verifiedBadgeLabel: realMatch.verifiedBadgeLabel ?? "Verified",
      ageGroupsServed: [],
      source: "real",
    };
  }

  return undefined;
}
