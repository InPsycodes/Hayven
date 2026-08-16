import { Suspense } from "react";

import { SearchFilters } from "@/components/search/search-filters";
import { TherapistResultRow } from "@/components/shared/therapist-result-row";
import { getRealSpecialties } from "@/lib/therapist/queries";
import { searchDiscoveryTherapists } from "@/lib/therapist/discovery";

interface SearchPageProps {
  searchParams: Promise<{
    query?: string;
    specialty?: string;
    location?: string;
    priceMax?: string;
    sessionType?: string;
  }>;
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
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <h1 className="sr-only">Find a therapist</h1>
      <Suspense>
        <SearchFilters specialties={specialties} />
      </Suspense>

      <p className="mt-6 text-sm text-muted-foreground">
        {results.length} verified {results.length === 1 ? "therapist" : "therapists"}
        {params.query ? ` match "${params.query}"` : " found"}
      </p>

      <div className="mt-2">
        {results.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No therapists match these filters yet. Try widening your search.
          </p>
        ) : (
          results.map((therapist) => (
            <TherapistResultRow key={therapist.id} therapist={therapist} />
          ))
        )}
      </div>
    </div>
  );
}
