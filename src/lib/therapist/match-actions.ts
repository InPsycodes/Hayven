"use server";

import { searchDiscoveryTherapists } from "./discovery";

/**
 * The count + a two-therapist peek for the matching quiz's results screen.
 * Runs the exact same query /search runs, so the number the parent sees here
 * is the number they land on.
 */
export async function getMatchPreview(input: {
  specialtyName?: string;
  sessionType?: "in_person" | "virtual";
  priceMax?: number;
}): Promise<{
  count: number;
  specialtyNames: string[];
  preview: { displayName: string; location: string; yearsPracticing: number; pricePerSession: number }[];
}> {
  const results = await searchDiscoveryTherapists({
    specialtyName: input.specialtyName,
    sessionType: input.sessionType,
    priceMax: input.priceMax,
  });

  const specialtyNames = [...new Set(results.flatMap((r) => r.specialtyNames))].slice(0, 3);

  return {
    count: results.length,
    specialtyNames,
    preview: results.slice(0, 2).map((r) => ({
      displayName: r.displayName,
      location: r.location,
      yearsPracticing: r.yearsPracticing,
      pricePerSession: r.pricePerSession,
    })),
  };
}
