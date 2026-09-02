import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit/check";

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

export interface RealSupportRequest {
  id: string;
  subject: string;
  message: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  requester: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

/** Cheap count-only query for a sidebar badge. */
export async function getOpenSupportRequestCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export async function getSupportRequests(): Promise<RealSupportRequest[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("id, subject, message, status, resolution, created_at, resolved_at, users!user_id(id, full_name, email, role)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const user = row.users as unknown as { id: string; full_name: string; email: string; role: string } | null;
    return {
      id: row.id,
      subject: row.subject,
      message: row.message,
      status: row.status,
      resolution: row.resolution,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      requester: {
        id: user?.id ?? "",
        fullName: user?.full_name ?? "Unknown",
        email: user?.email ?? "",
        role: user?.role ?? "",
      },
    };
  });
}

export interface RealSupervisorRequest {
  id: string;
  note: string | null;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  therapist: {
    id: string;
    fullName: string;
    email: string;
  };
}

/** Cheap count-only query for a sidebar badge. */
export async function getPendingSupervisorRequestCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("supervisor_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export async function getSupervisorRequests(): Promise<RealSupervisorRequest[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supervisor_requests")
    .select("id, note, status, requested_at, reviewed_at, users!therapist_id(id, full_name, email)")
    .order("status", { ascending: true })
    .order("requested_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const user = row.users as unknown as { id: string; full_name: string; email: string } | null;
    return {
      id: row.id,
      note: row.note,
      status: row.status,
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at,
      therapist: {
        id: user?.id ?? "",
        fullName: user?.full_name ?? "Unknown",
        email: user?.email ?? "",
      },
    };
  });
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
  /** Naira actually charged. */
  amount: number;
  /** Naira to refund per the cancellation policy. Falls back to `amount`
   *  for bookings cancelled before the policy column existed. */
  refundAmount: number;
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

  // Refund amounts owed per the cancellation policy, keyed by booking id.
  // Its own resilient query so a pre-0071 DB doesn't empty the whole queue.
  const bookingIds = data.map((r) => r.booking_id).filter((id): id is string => !!id);
  const policyAmounts = new Map<string, number | null>();
  if (bookingIds.length > 0) {
    const { data: refundRows, error: refundErr } = await supabase
      .from("bookings")
      .select("id, refund_amount")
      .in("id", bookingIds);
    if (!refundErr) for (const b of refundRows ?? []) policyAmounts.set(b.id, b.refund_amount ?? null);
  }

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
      const policy = policyAmounts.get(row.booking_id);
      // 0 => policy says nothing owed (late cancel after start); skip it.
      if (policy === 0) return null;
      return {
        paymentId: row.id,
        bookingId: row.booking_id,
        amount: row.amount,
        refundAmount: policy ?? row.amount,
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

/** Cheap count-only query for a sidebar badge -- filters on the joined booking status at the DB level via an inner join, instead of pulling every successful payment's full row (parent/child/therapist joins) just to count them. */
export async function getPendingRefundCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("payments")
    .select("id, bookings!inner(status)", { count: "exact", head: true })
    .eq("status", "successful")
    .eq("type", "session_commission")
    .eq("bookings.status", "cancelled");
  return count ?? 0;
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
            .eq("therapist_id", request.therapist_id)
            // Resubmission after "needs more info" inserts a new row rather
            // than replacing the old one (no link to a specific verification
            // request to scope by), so without this order credentials[0]
            // below is an arbitrary row, not necessarily the current one.
            .order("uploaded_at", { ascending: false }),
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

/** Covers both a plain role === "supervisor" account and a therapist granted is_supervisor -- see migration 0054. */
export async function getAllSupervisorsForAdmin(): Promise<AdminPickerOption[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name")
    .or("role.eq.supervisor,is_supervisor.eq.true")
    .order("full_name");
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
  // Detection, not prevention: an admin legitimately needs this page, so a
  // trip here must never block the read -- it only needs to alert someone
  // if one account is loading the full cross-platform report list far more
  // often than normal dashboard use would ever require.
  const session = await getSession();
  if (session) {
    await checkRateLimit(`bulk-read:reports:${session.userId}`, 20, 5 * 60);
  }

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

export interface RealReportPhraseVariant {
  id: string;
  domainKey: string;
  band: string | null;
  tone: "warm" | "direct";
  phrase: string;
  createdAt: string;
}

export async function getReportPhraseVariants(): Promise<RealReportPhraseVariant[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("report_phrase_variants")
    .select("id, domain_key, band, tone, phrase, created_at")
    .order("domain_key", { ascending: true })
    .order("band", { ascending: true })
    .order("tone", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    domainKey: row.domain_key,
    band: row.band,
    tone: row.tone === "direct" ? "direct" : "warm",
    phrase: row.phrase,
    createdAt: row.created_at,
  }));
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isSupervisor: boolean;
  status: string;
  createdAt: string;
}

export async function getAllUsersForAdmin(): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, phone, role, is_supervisor, status, created_at")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isSupervisor: row.is_supervisor === true,
    status: row.status,
    createdAt: row.created_at,
  }));
}
