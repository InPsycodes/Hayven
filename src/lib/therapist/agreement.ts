import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records that a therapist accepted a version of the Therapist Agreement
 * (migration 0105). Service-role write: there's no insert policy for
 * `authenticated`, so callers must have already confirmed the session owns
 * this therapist profile. Idempotent per (therapist, version).
 */
export async function recordAgreementAcceptance(therapistProfileId: string, version: string): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("therapist_agreement_acceptances")
    .upsert({ therapist_id: therapistProfileId, version }, { onConflict: "therapist_id,version", ignoreDuplicates: true });
  if (error) console.error("agreement acceptance insert failed", error.message);
  return !error;
}

/** Every version this therapist has accepted, newest first. */
export async function getAcceptedAgreementVersions(therapistProfileId: string): Promise<{ version: string; acceptedAt: string }[]> {
  const { data, error } = await createAdminClient()
    .from("therapist_agreement_acceptances")
    .select("version, accepted_at")
    .eq("therapist_id", therapistProfileId)
    .order("accepted_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({ version: row.version, acceptedAt: row.accepted_at }));
}

export interface InsuranceCover {
  insurer: string;
  policyNumber: string | null;
  expiresOn: string;
  uploadedAt: string;
}

/** The therapist's insurance certificate with the latest cover end date, or null if none uploaded. */
export async function getCurrentInsurance(therapistProfileId: string): Promise<InsuranceCover | null> {
  const { data, error } = await createAdminClient()
    .from("credentials")
    .select("issuing_body, membership_number, expires_on, uploaded_at")
    .eq("therapist_id", therapistProfileId)
    .eq("document_type", "insurance")
    .not("expires_on", "is", null)
    .order("expires_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    insurer: data.issuing_body,
    policyNumber: data.membership_number,
    expiresOn: data.expires_on,
    uploadedAt: data.uploaded_at,
  };
}
