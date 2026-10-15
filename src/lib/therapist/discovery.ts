import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

import { getRealVerifiedTherapists, getRealTherapistById, getNextAvailableSlots } from "./queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReviewSummaries, getTherapistReviewSummary, type ReviewSummary } from "@/lib/reviews/queries";
import { bookingWindow } from "@/lib/booking/window";
import type { SessionType } from "@/data/types";

const DISCOVERY_TAG = "discovery-therapists";

/**
 * Public-discovery shape for a verified therapist, drawn entirely from
 * Supabase (`therapist_public_profiles`). The demo/mock therapist layer was
 * removed ahead of the pilot -- every profile here is a real, admin-verified
 * therapist who set their own availability, so the booking flow always has a
 * real booking row and real Flutterwave checkout behind it.
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
  rating: ReviewSummary;
  photoUrl: string | null;
  /** ISO start of the soonest open slot within the booking window, or null. */
  nextAvailable: string | null;
}

export interface DiscoveryFilters {
  specialtyName?: string;
  location?: string;
  sessionType?: SessionType;
  priceMax?: number;
  query?: string;
  /** Keep only therapists with an open slot within this many days. */
  availableWithinDays?: number;
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
  if (filters.availableWithinDays) {
    if (!t.nextAvailable) return false;
    const cutoff = Date.now() + filters.availableWithinDays * 24 * 60 * 60 * 1000;
    if (new Date(t.nextAvailable).getTime() > cutoff) return false;
  }
  return true;
}

/**
 * Every verified therapist as a DiscoveryTherapist, unfiltered. This is the
 * expensive half of a search -- the view read plus a batched review-summary
 * and next-slot query -- and it's byte-identical for every visitor, so it's
 * cached for a short window and the per-request filter/sort runs off the
 * cached array.
 *
 * Service-role client, not the request-scoped one: unstable_cache can't call
 * cookies(), and every field here is already public (the view is granted to
 * anon; reviews and slots are returned only as aggregates).
 *
 * The 120s TTL is the staleness backstop; mutations that change who appears
 * or their ranking inputs call revalidateDiscoveryCache() for an immediate
 * refresh.
 */
const loadAllDiscoveryTherapists = unstable_cache(
  async (): Promise<DiscoveryTherapist[]> => {
    const db = createAdminClient();
    const results = await getRealVerifiedTherapists(db);
    const ids = results.map((t) => t.id);
    const [ratings, nextSlots] = await Promise.all([
      getReviewSummaries(ids, db),
      getNextAvailableSlots(ids, bookingWindow(), db),
    ]);

    return results.map((t) => ({
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
      rating: ratings.get(t.id) ?? { average: 0, count: 0 },
      photoUrl: t.photoUrl,
      nextAvailable: nextSlots.get(t.id) ?? null,
    }));
  },
  ["discovery-therapists-v1"],
  { revalidate: 120, tags: [DISCOVERY_TAG] }
);

/**
 * Bust the cached discovery list. Call after anything that changes who shows
 * in discovery or how they rank: verification decisions, availability edits,
 * profile/photo/bank changes, new or removed reviews.
 */
export function revalidateDiscoveryCache(): void {
  // profile "max" -> mark stale, serve stale-while-revalidate on the next
  // /search hit rather than forcing a blocking cache miss. The bare
  // single-arg form is deprecated in this Next version.
  revalidateTag(DISCOVERY_TAG, "max");
}

export async function searchDiscoveryTherapists(
  filters: DiscoveryFilters = {}
): Promise<DiscoveryTherapist[]> {
  const all = await loadAllDiscoveryTherapists();
  return all.filter((t) => matchesFilters(t, filters));
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
    rating: await getTherapistReviewSummary(match.id),
    photoUrl: match.photoUrl,
    nextAvailable: (await getNextAvailableSlots([match.id], bookingWindow())).get(match.id) ?? null,
  };
}
