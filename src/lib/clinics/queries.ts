import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCommissionRate } from "@/lib/payouts/commission";
import { lagosDate } from "@/lib/payouts/rates";

export interface TherapistClinic {
  id: string;
  name: string;
  /** The clinic has a payout account, so its therapists don't need their own. */
  hasBank: boolean;
}

/**
 * The clinic a therapist belongs to, if any. Read through the service-role
 * client (clinics has no client grants); callers have already identified
 * the therapist. Null before migration 0111 or with no clinic.
 */
export async function getTherapistClinic(therapistProfileId: string): Promise<TherapistClinic | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("therapist_profiles")
    .select("clinics(id, name, bank_account_number)")
    .eq("id", therapistProfileId)
    .maybeSingle();
  if (error || !data) return null;
  const clinic = data.clinics as unknown as { id: string; name: string; bank_account_number: string | null } | null;
  return clinic ? { id: clinic.id, name: clinic.name, hasBank: !!clinic.bank_account_number } : null;
}

export interface CommissionSummary {
  /** Hayven's share today, as a fraction. */
  rateToday: number;
  clinicName: string | null;
  /** While a clinic pilot runs: its last day and the rate after it. */
  pilotEndsOn: string | null;
  rateAfterPilot: number | null;
}

/** What a therapist's earnings page says about the commission they're on. */
export async function getCommissionSummary(therapistProfileId: string): Promise<CommissionSummary> {
  const admin = createAdminClient();
  const today = lagosDate(null);
  const { data, error } = await admin
    .from("therapist_profiles")
    .select("commission_rate_override, clinics(name, commission_rate, pilot_rate, pilot_ends_on)")
    .eq("id", therapistProfileId)
    .maybeSingle();
  if (error || !data) {
    return { rateToday: resolveCommissionRate({ override: null, clinic: null, sessionDate: today }), clinicName: null, pilotEndsOn: null, rateAfterPilot: null };
  }
  const c = data.clinics as unknown as {
    name: string;
    commission_rate: number | string;
    pilot_rate: number | string;
    pilot_ends_on: string | null;
  } | null;
  const override = data.commission_rate_override === null ? null : Number(data.commission_rate_override);
  const clinic = c
    ? { commissionRate: Number(c.commission_rate), pilotRate: Number(c.pilot_rate), pilotEndsOn: c.pilot_ends_on }
    : null;
  const inPilot = override === null && !!clinic?.pilotEndsOn && today <= clinic.pilotEndsOn;
  return {
    rateToday: resolveCommissionRate({ override, clinic, sessionDate: today }),
    clinicName: c?.name ?? null,
    pilotEndsOn: inPilot ? clinic!.pilotEndsOn : null,
    rateAfterPilot: inPilot ? clinic!.commissionRate : null,
  };
}

// --- admin ---------------------------------------------------------------

export interface ClinicListItem {
  id: string;
  name: string;
  therapistCount: number;
  commissionRate: number;
  pilotRate: number;
  pilotEndsOn: string | null;
  hasBank: boolean;
}

/** Every clinic, for /admin/clinics. Null when the table isn't there yet (before 0111). */
export async function listClinics(): Promise<ClinicListItem[] | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinics")
    .select("id, name, commission_rate, pilot_rate, pilot_ends_on, bank_account_number, therapist_profiles(id)")
    .order("name");
  if (error) return null;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    therapistCount: (c.therapist_profiles as unknown as { id: string }[] | null)?.length ?? 0,
    commissionRate: Number(c.commission_rate),
    pilotRate: Number(c.pilot_rate),
    pilotEndsOn: c.pilot_ends_on,
    hasBank: !!c.bank_account_number,
  }));
}

export interface ClinicDetail extends ClinicListItem {
  bankCode: string | null;
  bankAccountName: string | null;
  bankAccountMasked: string | null;
  members: { id: string; name: string; verificationStatus: string }[];
  /** Therapists not in any clinic, who can be added. */
  available: { id: string; name: string; verificationStatus: string }[];
}

export async function getClinicDetail(clinicId: string): Promise<ClinicDetail | null> {
  const admin = createAdminClient();
  const { data: c, error } = await admin
    .from("clinics")
    .select("id, name, commission_rate, pilot_rate, pilot_ends_on, bank_code, bank_account_number, bank_account_name")
    .eq("id", clinicId)
    .maybeSingle();
  if (error || !c) return null;

  const { data: therapists } = await admin
    .from("therapist_profiles")
    .select("id, clinic_id, verification_status, users(full_name)")
    .or(`clinic_id.eq.${clinicId},clinic_id.is.null`);
  const rows = (therapists ?? []).map((t) => ({
    id: t.id,
    clinicId: t.clinic_id as string | null,
    name: (t.users as unknown as { full_name: string } | null)?.full_name ?? "Unnamed therapist",
    verificationStatus: t.verification_status as string,
  }));
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const members = rows.filter((r) => r.clinicId === clinicId).sort(byName);
  const number = c.bank_account_number as string | null;

  return {
    id: c.id,
    name: c.name,
    therapistCount: members.length,
    commissionRate: Number(c.commission_rate),
    pilotRate: Number(c.pilot_rate),
    pilotEndsOn: c.pilot_ends_on,
    hasBank: !!number,
    bankCode: c.bank_code,
    bankAccountName: c.bank_account_name,
    bankAccountMasked: number ? `******${number.slice(-4)}` : null,
    members: members.map(({ id, name, verificationStatus }) => ({ id, name, verificationStatus })),
    available: rows
      .filter((r) => r.clinicId === null)
      .sort(byName)
      .map(({ id, name, verificationStatus }) => ({ id, name, verificationStatus })),
  };
}
