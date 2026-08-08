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

/** Cheap count-only query for a sidebar badge -- avoids fetching full rows/signed URLs just to know how many are pending. */
export async function getPendingVerificationCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("verification_requests")
    .select("id", { count: "exact", head: true })
    .in("status", VALID_STATUS_FILTERS.pending);
  return count ?? 0;
}

export interface RealAccountDeletionRequest {
  id: string;
  reason: string | null;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  requester: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

/** Cheap count-only query for a sidebar badge. */
export async function getPendingDeletionRequestCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("account_deletion_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export async function getAccountDeletionRequests(): Promise<RealAccountDeletionRequest[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id, reason, status, requested_at, reviewed_at, users!user_id(id, full_name, email, role)")
    .order("requested_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const user = row.users as unknown as { id: string; full_name: string; email: string; role: string } | null;
    return {
      id: row.id,
      reason: row.reason,
      status: row.status,
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at,
      requester: {
        id: user?.id ?? "",
        fullName: user?.full_name ?? "Unknown",
        email: user?.email ?? "",
        role: user?.role ?? "",
      },
    };
  });
}

export interface RealRefundOwed {
  paymentId: string;
  bookingId: string;
  amount: number;
  gatewayReference: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  parentName: string;
  parentEmail: string;
  childFirstName: string;
  therapistName: string;
}

/**
 * Successful session payments whose booking has since been cancelled --
 * cancelling never auto-refunds (no Paystack refund integration exists),
 * this is the queue an admin works through to process each one manually and
 * mark it done. Filters cancelled-status in JS rather than at the query
 * level since PostgREST's embedded-resource filtering isn't exercised
 * anywhere else in this codebase and this table is small enough that it
 * doesn't matter.
 */
export async function getBookingsNeedingRefund(): Promise<RealRefundOwed[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, amount, gateway_reference, booking_id, users!payer_id(full_name, email), bookings(status, cancelled_at, cancellation_reason, children(first_name), therapist_profiles(users(full_name)))"
    )
    .eq("status", "successful")
    .eq("type", "session_commission");

  if (error || !data) return [];

  return data
    .map((row) => {
      const booking = row.bookings as unknown as {
        status: string;
        cancelled_at: string | null;
        cancellation_reason: string | null;
        children: { first_name: string } | null;
        therapist_profiles: { users: { full_name: string } | null } | null;
      } | null;
      const payer = row.users as unknown as { full_name: string; email: string } | null;
      if (!booking || booking.status !== "cancelled") return null;
      return {
        paymentId: row.id,
        bookingId: row.booking_id,
        amount: row.amount,
        gatewayReference: row.gateway_reference,
        cancelledAt: booking.cancelled_at,
        cancellationReason: booking.cancellation_reason,
        parentName: payer?.full_name ?? "Unknown",
        parentEmail: payer?.email ?? "",
        childFirstName: booking.children?.first_name ?? "Unknown",
        therapistName: booking.therapist_profiles?.users?.full_name ?? "Unknown",
      };
    })
    .filter((r): r is RealRefundOwed => r !== null);
}

/** Cheap-enough count for a sidebar badge -- reuses the full query since the filter happens in JS (see above). */
export async function getPendingRefundCount(): Promise<number> {
  const refunds = await getBookingsNeedingRefund();
  return refunds.length;
}

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

// ---------------------------------------------------------------------------
// Care team assignment management
// ---------------------------------------------------------------------------

export interface AdminPickerOption {
  id: string;
  label: string;
}

export async function getAllTherapistsForAdmin(): Promise<AdminPickerOption[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("therapist_profiles").select("id, users(full_name)").order("id");
  return (data ?? []).map((row) => ({
    id: row.id,
    label: (row.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown therapist",
  }));
}

export async function getAllChildrenForAdmin(): Promise<AdminPickerOption[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("children").select("id, first_name").order("first_name");
  return (data ?? []).map((row) => ({ id: row.id, label: row.first_name }));
}

export async function getAllSupervisorsForAdmin(): Promise<AdminPickerOption[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("users").select("id, full_name").eq("role", "supervisor").order("full_name");
  return (data ?? []).map((row) => ({ id: row.id, label: row.full_name }));
}

export interface RealTherapistChildAssignment {
  id: string;
  therapistName: string;
  childName: string;
  therapyType: string | null;
  startedOn: string;
}

export async function getActiveTherapistChildAssignments(): Promise<RealTherapistChildAssignment[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("therapist_child_assignments")
    .select("id, therapy_type, started_on, therapist_profiles(users(full_name)), children(first_name)")
    .eq("status", "active")
    .order("started_on", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    therapistName:
      (row.therapist_profiles as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ??
      "Unknown",
    childName: (row.children as unknown as { first_name: string } | null)?.first_name ?? "Unknown",
    therapyType: row.therapy_type,
    startedOn: row.started_on,
  }));
}

export interface PlatformMetrics {
  totalParents: number;
  totalTherapists: number;
  verifiedTherapists: number;
  totalSupervisors: number;
  totalChildren: number;
  totalBookings: number;
  completedBookings: number;
  totalSessions: number;
  totalReports: number;
  publishedReports: number;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = createAdminClient();
  const [
    parents,
    therapists,
    verifiedTherapists,
    supervisors,
    children,
    bookings,
    completedBookings,
    sessions,
    reports,
    publishedReports,
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "parent"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "therapist"),
    supabase
      .from("therapist_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "supervisor"),
    supabase.from("children").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("therapy_sessions").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  return {
    totalParents: parents.count ?? 0,
    totalTherapists: therapists.count ?? 0,
    verifiedTherapists: verifiedTherapists.count ?? 0,
    totalSupervisors: supervisors.count ?? 0,
    totalChildren: children.count ?? 0,
    totalBookings: bookings.count ?? 0,
    completedBookings: completedBookings.count ?? 0,
    totalSessions: sessions.count ?? 0,
    totalReports: reports.count ?? 0,
    publishedReports: publishedReports.count ?? 0,
  };
}

export interface AdminReportSummary {
  id: string;
  status: string;
  childName: string;
  therapistName: string;
  generatedAt: string | null;
  publishedAt: string | null;
}

export async function getAllReportsForAdmin(): Promise<AdminReportSummary[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, status, generated_at, published_at, children(first_name), therapy_sessions(therapist_profiles(users(full_name)))"
    )
    .order("generated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    generatedAt: row.generated_at,
    publishedAt: row.published_at,
    childName: (row.children as unknown as { first_name: string } | null)?.first_name ?? "Unknown",
    therapistName:
      (
        row.therapy_sessions as unknown as {
          therapist_profiles: { users: { full_name: string } | null } | null;
        } | null
      )?.therapist_profiles?.users?.full_name ?? "Unknown",
  }));
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export async function getAuditLogEntries({ limit = 200 }: { limit?: number } = {}): Promise<AuditLogEntry[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_role, action, entity_type, entity_id, created_at, users(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    actorName: (row.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }));
}

export interface RealSupervisorAssignment {
  id: string;
  supervisorName: string;
  therapistName: string;
  startedOn: string;
}

export async function getActiveSupervisorAssignments(): Promise<RealSupervisorAssignment[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("supervisor_assignments")
    .select("id, started_on, users(full_name), therapist_profiles(users(full_name))")
    .eq("status", "active")
    .order("started_on", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    supervisorName: (row.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
    therapistName:
      (row.therapist_profiles as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ??
      "Unknown",
    startedOn: row.started_on,
  }));
}
