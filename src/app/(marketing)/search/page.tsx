import { Suspense } from "react";
import Link from "next/link";

import { SearchFilters } from "@/components/search/search-filters";
import { TherapistResultRow } from "@/components/shared/therapist-result-row";
import { getRealSpecialties } from "@/lib/therapist/queries";
import { searchDiscoveryTherapists, type DiscoveryTherapist } from "@/lib/therapist/discovery";

interface SearchPageProps {
  searchParams: Promise<{
    query?: string;
    specialty?: string;
    location?: string;
    priceMax?: string;
    sessionType?: string;
    available?: string;
    sort?: string;
  }>;
}

const AVAILABLE_DAYS: Record<string, number> = { "2w": 14, "30d": 30 };

function nextAvailableMs(t: DiscoveryTherapist): number {
  return t.nextAvailable ? new Date(t.nextAvailable).getTime() : Number.POSITIVE_INFINITY;
}

function sortTherapists(therapists: DiscoveryTherapist[], sort: string | undefined): DiscoveryTherapist[] {
  const list = [...therapists];
  switch (sort) {
    case "rating":
      return list.sort(
        (a, b) => b.rating.average - a.rating.average || b.rating.count - a.rating.count
      );
    case "price_asc":
      return list.sort((a, b) => a.pricePerSession - b.pricePerSession);
    case "price_desc":
      return list.sort((a, b) => b.pricePerSession - a.pricePerSession);
    case "experience":
      return list.sort((a, b) => b.yearsPracticing - a.yearsPracticing);
    default:
      // Recommended: soonest opening first (no opening sinks to the bottom),
      // then higher-rated.
      return list.sort(
        (a, b) =>
          nextAvailableMs(a) - nextAvailableMs(b) ||
          b.rating.average - a.rating.average ||
          b.rating.count - a.rating.count
      );
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const [specialties, results] = await Promise.all([
    getRealSpecialties(),
    searchDiscoveryTherapists({
      query: params.query,
      specialtyName: params.specialty,
      location: params.location,
      priceMax: params.priceMax ? Number(params.priceMax) : undefined,
      sessionType: params.sessionType as "in_person" | "virtual" | undefined,
      availableWithinDays: params.available ? AVAILABLE_DAYS[params.available] : undefined,
    }),
  ]);

  const therapists = sortTherapists(results, params.sort);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <span className="eyebrow text-rust-dark">Verified specialists</span>
      <h1 className="mt-2 font-serif text-2xl leading-tight text-charcoal md:text-3xl">
        Find a therapist for your child
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
        Every specialist is admin-verified before their profile goes live.
      </p>

      <div className="mt-6">
        <Suspense>
          <SearchFilters specialties={specialties} resultCount={therapists.length} />
        </Suspense>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {therapists.length === 0 ? (
          <p className="rounded-2xl bg-canvas-white p-10 text-center text-sm text-ink-soft ring-1 ring-charcoal/10">
            No therapists match these filters yet. Try widening your search, or{" "}
            <Link href="/needs-assessment" className="font-medium text-terracotta hover:underline">
              take the 2-minute quiz
            </Link>
            .
          </p>
        ) : (
          therapists.map((therapist) => (
            <TherapistResultRow key={therapist.id} therapist={therapist} />
          ))
        )}
      </div>
    </div>
  );
}
