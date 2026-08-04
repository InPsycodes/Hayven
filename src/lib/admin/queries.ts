import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RealCredential {
  id: string;
  documentType: string;
  fileName: string;
  issuingBody: string;
  membershipNumber: string | null;
  uploadedAt: string;
  filePath: string;
  signedUrl: string | null;
}

export interface RealVerificationRequest {
  id: string;
  status: string;
  verificationMethod: string | null;
  reviewerNotes: string | null;
  parentFacingReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  therapist: {
    id: string;
    displayName: string;
    email: string;
    specialties: string[];
    professionalBody: string | null;
    membershipNumber: string | null;
    yearsPracticing: number | null;
  };
  credentials: RealCredential[];
}

const VALID_STATUS_FILTERS: Record<string, string[]> = {
  pending: ["submitted", "in_review"],
  flagged: ["needs_more_info"],
  approved: ["approved"],
};

export async function getRealVerificationRequests(
  filter?: string
): Promise<RealVerificationRequest[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("verification_requests")
    .select(
      "id, status, verification_method, reviewer_notes, parent_facing_reason, submitted_at, reviewed_at, therapist_id"
    )
    .order("submitted_at", { ascending: true });

  const statuses = filter ? VALID_STATUS_FILTERS[filter] : undefined;
  if (statuses) query = query.in("status", statuses);

  const { data: requests, error } = await query;
  if (error || !requests) return [];

  const results = await Promise.all(
    requests.map(async (request) => {
      const [{ data: profile }, { data: specialtyRows }, { data: credentialRows }] =
        await Promise.all([
          supabase
            .from("therapist_profiles")
            .select("id, user_id, years_practicing, users(full_name, email)")
            .eq("id", request.therapist_id)
            .single(),
          supabase
            .from("therapist_specialties")
            .select("specialties(name)")
            .eq("therapist_id", request.therapist_id),
          supabase
            .from("credentials")
            .select("id, document_type, file_url, issuing_body, membership_number, uploaded_at")
            .eq("therapist_id", request.therapist_id),
        ]);

      const user = profile?.users as unknown as { full_name: string; email: string } | null;
      const credentials = credentialRows ?? [];

      return {
        id: request.id,
        status: request.status,
        verificationMethod: request.verification_method,
        reviewerNotes: request.reviewer_notes,
        parentFacingReason: request.parent_facing_reason,
        submittedAt: request.submitted_at,
        reviewedAt: request.reviewed_at,
        therapist: {
          id: request.therapist_id,
          displayName: user?.full_name ?? "Unknown",
          email: user?.email ?? "",
          specialties: (specialtyRows ?? []).map(
            (row) => (row.specialties as unknown as { name: string } | null)?.name ?? ""
          ),
          professionalBody: credentials[0]?.issuing_body ?? null,
          membershipNumber: credentials[0]?.membership_number ?? null,
          yearsPracticing: profile?.years_practicing ?? null,
        },
        credentials: await Promise.all(
          credentials.map(async (c) => {
            const { data: signed } = await supabase.storage
              .from("credentials")
              .createSignedUrl(c.file_url, 60 * 5);
            return {
              id: c.id,
              documentType: c.document_type,
              fileName: c.file_url.split("/").pop() ?? c.file_url,
              issuingBody: c.issuing_body,
              membershipNumber: c.membership_number,
              uploadedAt: c.uploaded_at,
              filePath: c.file_url,
              signedUrl: signed?.signedUrl ?? null,
            };
          })
        ),
      };
    })
  );

  return results;
}

export async function getRealVerificationRequestById(
  id: string
): Promise<RealVerificationRequest | undefined> {
  const all = await getRealVerificationRequests();
  return all.find((r) => r.id === id);
}

/** Short-lived signed URL for a private credential file -- never a public link. */
export async function getSignedCredentialUrl(filePath: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("credentials")
    .createSignedUrl(filePath, 60 * 5); // 5 minutes
  if (error || !data) return null;
  return data.signedUrl;
}
