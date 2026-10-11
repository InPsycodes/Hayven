import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { toLagosWallClock } from "@/data/format";
import { resolveCommissionRate, type ClinicTerms } from "@/lib/payouts/commission";

type Admin = ReturnType<typeof createAdminClient>;

export interface TherapistTerms {
  override: number | null;
  clinicId: string | null;
  clinicName: string | null;
  clinic: ClinicTerms | null;
}

const STANDARD: TherapistTerms = { override: null, clinicId: null, clinicName: null, clinic: null };

interface ClinicRow {
  id: string;
  name: string;
  commission_rate: number | string;
  pilot_rate: number | string;
  pilot_ends_on: string | null;
}

function toTerms(override: number | string | null, clinic: ClinicRow | null): TherapistTerms {
  return {
    override: override === null || override === undefined ? null : Number(override),
    clinicId: clinic?.id ?? null,
    clinicName: clinic?.name ?? null,
    clinic: clinic
      ? {
          commissionRate: Number(clinic.commission_rate),
          pilotRate: Number(clinic.pilot_rate),
          pilotEndsOn: clinic.pilot_ends_on,
        }
      : null,
  };
}

/**
 * Commission terms for a set of therapists. Falls back to the standard
 * terms if the clinic columns aren't there yet (before migration 0111),
 * so earnings keep being recorded at 20% rather than failing.
 */
export async function loadTherapistTerms(admin: Admin, therapistIds: string[]): Promise<Map<string, TherapistTerms>> {
  const out = new Map<string, TherapistTerms>();
  if (therapistIds.length === 0) return out;
  const { data, error } = await admin
    .from("therapist_profiles")
    .select("id, commission_rate_override, clinics(id, name, commission_rate, pilot_rate, pilot_ends_on)")
    .in("id", therapistIds);
  if (error || !data) {
    for (const id of therapistIds) out.set(id, STANDARD);
    return out;
  }
  for (const row of data) {
    out.set(row.id, toTerms(row.commission_rate_override, row.clinics as unknown as ClinicRow | null));
  }
  for (const id of therapistIds) if (!out.has(id)) out.set(id, STANDARD);
  return out;
}

/** The Lagos calendar day of a timestamp, YYYY-MM-DD: the date a session counts as for pilot terms. */
export function lagosDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return toLagosWallClock(d).toISOString().slice(0, 10);
}

export function rateFor(terms: TherapistTerms | undefined, sessionDate: string): number {
  return resolveCommissionRate({
    override: terms?.override ?? null,
    clinic: terms?.clinic ?? null,
    sessionDate,
  });
}
