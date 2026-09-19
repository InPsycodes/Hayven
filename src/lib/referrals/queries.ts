import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ReferralStatus } from "@/lib/referrals/actions";

export interface RealReferral {
  id: string;
  referenceCode: string;
  childName: string;
  childAge: number | null;
  parentContact: string;
  referrerName: string;
  referrerFacility: string | null;
  referrerSpecialty: string | null;
  referrerContact: string;
  reasonTags: string[];
  additionalInfo: string | null;
  status: ReferralStatus;
  createdAt: string;
  statusUpdatedAt: string;
}

/**
 * Admin-only reader. Like getRealVerificationRequests, this relies on the
 * caller already being gated by admin/layout.tsx's role check -- it doesn't
 * re-check role itself, matching every other function in src/lib/admin/queries.ts.
 */
export async function getReferralQueue(): Promise<RealReferral[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("referrals")
    .select(
      "id, reference_code, child_name, child_age, parent_contact, referrer_name, referrer_facility, referrer_specialty, referrer_contact, reason_tags, additional_info, status, created_at, status_updated_at"
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    referenceCode: r.reference_code,
    childName: r.child_name,
    childAge: r.child_age,
    parentContact: r.parent_contact,
    referrerName: r.referrer_name,
    referrerFacility: r.referrer_facility,
    referrerSpecialty: r.referrer_specialty,
    referrerContact: r.referrer_contact,
    reasonTags: r.reason_tags ?? [],
    additionalInfo: r.additional_info,
    status: r.status,
    createdAt: r.created_at,
    statusUpdatedAt: r.status_updated_at,
  }));
}

export async function getOpenReferralCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .neq("status", "care_started");
  return count ?? 0;
}
