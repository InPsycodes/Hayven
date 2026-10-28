import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { SearchFilters } from "@/components/search/search-filters";
import { LaunchPanel } from "@/components/search/launch-panel";
import { SearchAnalytics } from "@/components/analytics/search-analytics";
import { TherapistResultRow } from "@/components/shared/therapist-result-row";
import { getRealSpecialties } from "@/lib/therapist/queries";
import { searchDiscoveryTherapists, type DiscoveryTherapist } from "@/lib/therapist/discovery";
import { canonicalFor, NOINDEX_FOLLOW } from "@/lib/seo/metadata";
import { getBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { safeJsonLdStringify } from "@/lib/seo/json-ld";

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

const DEFAULT_TITLE = "Find a Verified Child Therapist in Nigeria";
const DEFAULT_DESCRIPTION =
  "Browse admin-verified psychologists and speech, occupational, and ABA therapists for children across Nigeria. Filter by specialty, location, session type, and availability.";

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;

  // A filtered view is real, useful content -- link equity should still
  // flow to it (follow) -- but every specialty x location x price
  // combination indexed as its own page would register as near-duplicate
  // content and dilute ranking rather than help it. Only the bare,
  // unfiltered page is indexed; canonical always points there regardless.
  const hasFilters = Boolean(
    params.query || params.specialty || params.location || params.priceMax || params.sessionType || params.available
  );

  const title = params.specialty
    ? `${params.specialty}${params.location ? ` in ${params.location}` : ""} Therapists`
    : params.location
      ? `Child Therapists in ${params.location}`
      : DEFAULT_TITLE;

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: canonicalFor("/search"),
    robots: hasFilters ? NOINDEX_FOLLOW : undefined,
    openGraph: { title, description: DEFAULT_DESCRIPTION },
  };
}

const AVAILABLE_DAYS: Record<string, number> = { "2w": 14, "30d": 30 };

/** Same footprint as SearchFilters so the Suspense swap causes no layout shift. */
function SearchFiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-9 max-w-md rounded-full bg-charcoal/5" />
      <div className="flex flex-wrap gap-2">
        {[68, 84, 76, 104, 96].map((w) => (
          <div key={w} className="h-8 rounded-full bg-charcoal/5" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between border-b border-border pb-2">
        <div className="h-5 w-40 rounded bg-charcoal/5" />
        <div className="h-8 w-28 rounded bg-charcoal/5" />
      </div>
    </div>
  );
}

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
  const [specialties, results, everyone] = await Promise.all([
    getRealSpecialties(),
    searchDiscoveryTherapists({
      query: params.query,
      specialtyName: params.specialty,
      location: params.location,
      priceMax: params.priceMax ? Number(params.priceMax) : undefined,
      sessionType: params.sessionType as "in_person" | "virtual" | undefined,
      availableWithinDays: params.available ? AVAILABLE_DAYS[params.available] : undefined,
    }),
    // Unfiltered list (same 120s cache) -- tells "nobody is live yet" apart
    // from "nobody matches these filters".
    searchDiscoveryTherapists({}),
  ]);
  const nobodyLive = everyone.length === 0;

  const therapists = sortTherapists(results, params.sort);

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Find a Therapist", path: "/search" },
          ])
        ),
      }}
    />
    <SearchAnalytics
      count={therapists.length}
      sort={params.sort}
      sessionType={params.sessionType}
      specialty={params.specialty}
    />
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <span className="eyebrow text-rust-dark">Verified specialists</span>
      <h1 className="mt-2 font-serif text-2xl leading-tight text-charcoal md:text-3xl">
        Find a therapist for your child
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
        Every specialist is admin-verified before their profile goes live.
      </p>

      {/* min-height reserves the filter bar's space so it doesn't shove the
          results list down when SearchFilters (a useSearchParams client
          component) hydrates in -- was a measurable CLS hit on /search. */}
      {nobodyLive ? (
        <div className="mt-8">
          <LaunchPanel specialty={params.specialty} />
        </div>
      ) : (
      <>
      <div className="mt-6 min-h-[168px] sm:min-h-[140px]">
        <Suspense fallback={<SearchFiltersSkeleton />}>
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
      </>
      )}
    </div>
    </>
  );
}
