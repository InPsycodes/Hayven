"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { createRefund, isFlutterwaveConfigured } from "@/lib/payments/flutterwave";
import { refundOutcome } from "@/lib/payments/flutterwave-shared";
import { finalizeRefundByTransaction } from "@/lib/booking/webhook-refund";
import { isValidDomainBand } from "@/lib/reports/phrase-domains";
import { revalidateDiscoveryCache } from "@/lib/therapist/discovery";
import { releaseBookingEarnings } from "@/lib/payouts/earnings";
import { purgeAccountPersonalData } from "@/lib/account/purge";
import { cancelBookingsForDepartedTherapist } from "@/lib/booking/departed-therapist";

export type VerificationDecision = "approved" | "rejected" | "needs_more_info";
const VERIFICATION_DECISIONS: readonly VerificationDecision[] = ["approved", "rejected", "needs_more_info"];

export async function reviewVerificationRequestReal(
  requestId: string,
  status: VerificationDecision,
  reviewerNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  // status is trusted at runtime past the TS type -- a crafted call with an
  // out-of-range value would otherwise fall through every branch below and,
  // on the notification-copy lookup further down, spread an
  // undefined-keyed object into createNotification (L-14, production audit
  // 2026-09-03).
  if (!VERIFICATION_DECISIONS.includes(status)) {
    return { ok: false, error: "Invalid decision." };
  }

  const supabase = createAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("verification_requests")
    .select("id, therapist_id")
    .eq("id", requestId)
    .single();
  if (fetchError || !request) {
    return { ok: false, error: "Verification request not found." };
  }

  const { error: updateError } = await supabase
    .from("verification_requests")
    .update({
      status,
      admin_id: session.userId,
      reviewed_at: new Date().toISOString(),
      ...(reviewerNotes ? { reviewer_notes: reviewerNotes } : {}),
    })
    .eq("id", requestId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (status === "approved") {
    const { data: credential } = await supabase
      .from("credentials")
      .select("issuing_body")
      .eq("therapist_id", request.therapist_id)
      // Never the insurance row (0105): its issuing_body is the insurer.
      .neq("document_type", "insurance")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const initials = (credential?.issuing_body ?? "")
      .split(" ")
      .map((w: string) => w[0])
      .join("");

    await supabase
      .from("therapist_profiles")
      .update({
        verification_status: "verified",
        verified_badge_label: credential?.issuing_body
          ? `Verified ${initials} Member in Good Standing`
          : "Verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.therapist_id);
  } else if (status === "rejected") {
    await supabase
      .from("therapist_profiles")
      .update({ verification_status: "rejected" })
      .eq("id", request.therapist_id);
  } else if (status === "needs_more_info") {
    await supabase
      .from("therapist_profiles")
      .update({ verification_status: "flagged" })
      .eq("id", request.therapist_id);
  }

  await logAuditEvent({
    actor: session,
    action: "verification.decide",
    entityType: "verification_request",
    entityId: requestId,
    metadata: { status, therapistId: request.therapist_id },
  });

  const verificationCopy: Record<VerificationDecision, { title: string; body: string }> = {
    approved: {
      title: "Verification approved",
      body: "Your credentials have been verified. Your profile is now live for parents to find.",
    },
    rejected: {
      title: "Verification rejected",
      body: "Your verification request wasn't approved. Contact Hayven for details.",
    },
    needs_more_info: {
      title: "More information needed",
      body: "We need more information to complete your verification. Please review your credentials and resubmit.",
    },
  };
  const { data: therapistProfile } = await supabase
    .from("therapist_profiles")
    .select("user_id")
    .eq("id", request.therapist_id)
    .maybeSingle();
  if (therapistProfile?.user_id) {
    await createNotification({
      userId: therapistProfile.user_id,
      type: "verification_update",
      ...verificationCopy[status],
      url: "/therapist/profile",
    });
  }

  revalidatePath("/admin/verification");
  // A verify/reject/flag decision changes who appears in public discovery.
  revalidateDiscoveryCache();
  return { ok: true };
}

export type AccountDeletionDecision = "reviewed" | "actioned";

/**
 * Marks a request reviewed (an admin has confirmed it's a legitimate
 * request from the account holder) or actioned. "reviewed" starts the
 * 30-day clock Privacy Policy Section 6 promises ("deleted within 30 days
 * of a verified deletion request") -- purgeReviewedAccountDeletions
 * (src/lib/account/cron.ts) auto-actions it once that window closes.
 * Marking "actioned" here does the same thing immediately, as an admin
 * escape hatch for a request that shouldn't wait (e.g. a legally urgent
 * one) -- either path runs the real purge (E3, src/lib/account/purge.ts),
 * not just a label change.
 */
export async function reviewAccountDeletionRequest(
  requestId: string,
  status: AccountDeletionDecision,
  adminNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = createAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("account_deletion_requests")
    .select("id, user_id")
    .eq("id", requestId)
    .single();
  if (fetchError || !request) {
    return { ok: false, error: "Deletion request not found." };
  }

  // Purge before recording "actioned" -- if it fails, the request should
  // still show as needing attention rather than falsely claiming the
  // deletion happened.
  if (status === "actioned") {
    try {
      await purgeAccountPersonalData(request.user_id, { adminId: session.userId, requestId });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to purge the account's data." };
    }
  }

  const { error: updateError } = await supabase
    .from("account_deletion_requests")
    .update({
      status,
      admin_id: session.userId,
      reviewed_at: new Date().toISOString(),
      ...(adminNotes ? { admin_notes: adminNotes } : {}),
    })
    .eq("id", requestId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await logAuditEvent({
    actor: session,
    action: "account_deletion_request.review",
    entityType: "account_deletion_request",
    entityId: requestId,
    metadata: { status, userId: request.user_id },
  });

  revalidatePath("/admin/deletion-requests");
  return { ok: true };
}

/**
 * Records that a refund was processed manually (Flutterwave dashboard, bank
 * transfer, whatever the team actually used) -- there's no refund API
 * integration in this codebase, so this never moves money itself, only
 * tracks that it's been handled outside the app.
 */
export async function markPaymentRefunded(
  paymentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = createAdminClient();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, booking_id")
    .eq("id", paymentId)
    .single();
  if (fetchError || !payment) {
    return { ok: false, error: "Payment not found." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", paymentId)
    .eq("status", "successful")
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) return { ok: false, error: "Already marked refunded." };

  await logAuditEvent({
    actor: session,
    action: "payment.mark_refunded",
    entityType: "payment",
    entityId: paymentId,
    metadata: { bookingId: payment.booking_id },
  });

  if (payment.booking_id) {
    await supabase.from("bookings").update({ refund_status: "manual" }).eq("id", payment.booking_id);
    // A refund handled outside Flutterwave (dashboard/bank transfer) still
    // means the parent got their money back -- the therapist's earning on
    // this booking must be reversed the same as any other refund path, or
    // Hayven pays it out on top of the refund (M-2, production audit
    // 2026-09-03).
    await releaseBookingEarnings(supabase, payment.booking_id, true);
  }

  revalidatePath("/admin/refunds");
  return { ok: true };
}

/**
 * Starts the Flutterwave refund for the amount the policy computed
 * (bookings.refund_amount, or the full charge for a legacy cancellation).
 * Flutterwave may finish it at once or later: the refund webhook (or the
 * reconciliation sweep checking refunds still processing) flips the payment
 * to 'refunded' and notifies the parent. Falls back to a clear error if
 * refunds aren't configured.
 */
export async function processRefund(
  paymentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (!isFlutterwaveConfigured()) {
    return { ok: false, error: "Flutterwave isn't configured. Refund it manually and mark it done." };
  }

  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id, amount, status, gateway, gateway_transaction_id, created_at, bookings(refund_amount, refund_status)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status !== "successful") return { ok: false, error: "This payment can't be refunded." };
  if (!payment.gateway_transaction_id) {
    // Taken through Paystack (test mode only) before the switch to Flutterwave.
    return { ok: false, error: "This payment wasn't taken through Flutterwave. Refund it manually and mark it done." };
  }

  const booking = payment.bookings as unknown as { refund_amount: number | null; refund_status: string | null } | null;
  if (booking?.refund_status === "processing" || booking?.refund_status === "processed") {
    return { ok: false, error: "A refund for this is already in progress." };
  }

  // BOOK-01: bookings.refund_amount is a single column meant for the
  // booking's own cancellation-policy refund. If this booking has more
  // than one successful charge (a duplicate/orphaned payment,
  // getBookingsNeedingRefund's "duplicate_charge" case), that column may
  // hold an amount for a completely unrelated cancellation -- a duplicate
  // payment always owes back its own full amount, never the booking-level
  // figure.
  let amountNaira = booking?.refund_amount ?? payment.amount;
  if (payment.booking_id) {
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", payment.booking_id)
      .eq("status", "successful")
      .eq("type", "session_commission")
      .lt("created_at", payment.created_at);
    if ((count ?? 0) > 0) amountNaira = payment.amount;
  }
  if (amountNaira <= 0) return { ok: false, error: "The policy says nothing is owed on this booking." };

  // BOOK-03, pre-launch audit (P1): claim the refund atomically -- checked
  // in the WHERE clause of the update itself, not the separate read above
  // -- BEFORE calling Flutterwave, not after. The read above is only a fast
  // path for the common "already done" case; this is what actually closes
  // a double-click or two admins racing the same payment. Same pattern as
  // initiateFlutterwavePayment's payment_initiated_at lock.
  if (payment.booking_id) {
    const { data: claimed, error: claimError } = await supabase
      .from("bookings")
      .update({ refund_status: "processing" })
      .eq("id", payment.booking_id)
      .or("refund_status.is.null,refund_status.eq.manual")
      .select("id")
      .maybeSingle();
    if (claimError) return { ok: false, error: claimError.message };
    if (!claimed) return { ok: false, error: "A refund for this is already in progress." };
  }

  let refund: { id: string; status: string };
  try {
    refund = await createRefund(payment.gateway_transaction_id, amountNaira);
  } catch (err) {
    // Release the claim on a genuine failure so a retry isn't blocked --
    // same reasoning as initiateFlutterwavePayment's catch block.
    if (payment.booking_id) {
      await supabase.from("bookings").update({ refund_status: null }).eq("id", payment.booking_id);
    }
    return { ok: false, error: err instanceof Error ? err.message : "Flutterwave refused the refund." };
  }
  // Kept so a refund still processing can be checked later.
  await supabase.from("payments").update({ refund_gateway_id: refund.id }).eq("id", payment.id);
  if (refundOutcome(refund.status) !== "pending") {
    await finalizeRefundByTransaction(refund.status, payment.gateway_transaction_id);
  }

  if (payment.booking_id) {
    // Reverse the therapist's earning now, at initiation, the same moment a
    // dispute resolution does it -- don't wait on the refund.processed
    // webhook, which is also covered as a defensive backstop (M-2,
    // production audit 2026-09-03).
    await releaseBookingEarnings(supabase, payment.booking_id, true);
  }

  await logAuditEvent({
    actor: session,
    action: "payment.refund_initiated",
    entityType: "payment",
    entityId: paymentId,
    metadata: { bookingId: payment.booking_id, amountNaira },
  });

  revalidatePath("/admin/refunds");
  return { ok: true };
}

export async function assignTherapistToChild(
  therapistId: string,
  childId: string,
  therapyType?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("therapist_child_assignments").insert({
    therapist_id: therapistId,
    child_id: childId,
    therapy_type: therapyType && therapyType.trim() ? therapyType.trim() : null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This therapist is already assigned to this child." };
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.create",
    entityType: "therapist_child_assignment",
    childId,
    metadata: { therapistId },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function endTherapistChildAssignment(assignmentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("therapist_child_assignments")
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10), ended_reason: "manual" })
    .eq("id", assignmentId)
    .select("id, child_id, therapist_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Assignment not found." };

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.end",
    entityType: "therapist_child_assignment",
    entityId: assignmentId,
    childId: data.child_id,
    metadata: { therapistId: data.therapist_id },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * E5, external PRD review: reactivates a lapsed (manually ended or
 * inactivity-expired) assignment when care is actually continuing. Creates
 * a fresh row rather than flipping the old one back to active -- matching
 * this table's own established convention (0037's comment: "every real
 * 'reassignment' ends one row... and creates a new one"), so the expired
 * row stays an untouched historical record of exactly when and why access
 * previously ended.
 */
export async function renewTherapistChildAssignment(
  assignmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("therapist_child_assignments")
    .select("therapist_id, child_id, therapy_type, status")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Assignment not found." };
  if (existing.status === "active") return { ok: false, error: "This assignment is already active." };

  const { data, error } = await supabase
    .from("therapist_child_assignments")
    .insert({ therapist_id: existing.therapist_id, child_id: existing.child_id, therapy_type: existing.therapy_type })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This therapist is already actively assigned to this child." };
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "assignment.therapist_child.renew",
    entityType: "therapist_child_assignment",
    entityId: data.id,
    childId: existing.child_id,
    metadata: { therapistId: existing.therapist_id, previousAssignmentId: assignmentId },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function assignSupervisorToTherapist(
  supervisorId: string,
  therapistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();

  // is_supervisor_of_therapist() only checks the assignment row + status, never the
  // target user's actual role -- so this table's own RLS wouldn't catch a bad id here.
  // E9: every real supervisor is a therapist granted is_supervisor (migration
  // 0054) -- the standalone role === "supervisor" mechanism is retired, zero
  // live accounts use it -- getAllSupervisorsForAdmin() already only offers
  // is_supervisor accounts as pickable options.
  const { data: targetUser } = await supabase.from("users").select("is_supervisor").eq("id", supervisorId).maybeSingle();
  if (!targetUser?.is_supervisor) {
    return { ok: false, error: "That user isn't a supervisor." };
  }

  const { error } = await supabase
    .from("supervisor_assignments")
    .insert({ supervisor_id: supervisorId, therapist_id: therapistId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This supervisor already oversees this therapist." };
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "assignment.supervisor_therapist.create",
    entityType: "supervisor_assignment",
    metadata: { supervisorId, therapistId },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function endSupervisorAssignment(assignmentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supervisor_assignments")
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10) })
    .eq("id", assignmentId)
    .select("id, supervisor_id, therapist_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Assignment not found." };

  await logAuditEvent({
    actor: session,
    action: "assignment.supervisor_therapist.end",
    entityType: "supervisor_assignment",
    entityId: assignmentId,
    metadata: { supervisorId: data.supervisor_id, therapistId: data.therapist_id },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function addReportPhraseVariant(
  domainKey: string,
  band: string | null,
  tone: "warm" | "direct",
  phrase: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  if (!isValidDomainBand(domainKey, band)) {
    return { ok: false, error: "Choose a valid domain and band." };
  }
  if (!phrase.trim()) {
    return { ok: false, error: "Enter a phrase." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("report_phrase_variants")
    .insert({ domain_key: domainKey, band, tone, phrase: phrase.trim(), created_by: session.userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actor: session,
    action: "report_phrase.add",
    entityType: "report_phrase_variant",
    entityId: data.id,
    metadata: { domainKey, band, tone },
  });

  revalidatePath("/admin/report-phrases");
  return { ok: true };
}

export async function deleteReportPhraseVariant(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("report_phrase_variants")
    .delete()
    .eq("id", id)
    .select("id, domain_key, band, tone")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Phrase not found." };

  await logAuditEvent({
    actor: session,
    action: "report_phrase.delete",
    entityType: "report_phrase_variant",
    entityId: id,
    metadata: { domainKey: data.domain_key, band: data.band, tone: data.tone },
  });

  revalidatePath("/admin/report-phrases");
  return { ok: true };
}

/** Resolving sends the reply straight back to the requester via
 * createNotification (in-app + email) -- there's no separate "internal
 * notes" field here since the whole point of this table is the reply
 * actually reaching them. */
export async function resolveSupportRequest(
  requestId: string,
  resolution: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  if (!resolution.trim()) {
    return { ok: false, error: "Write a reply before resolving." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("support_requests")
    .update({
      status: "resolved",
      admin_id: session.userId,
      resolution: resolution.trim(),
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "open")
    .select("id, user_id, subject")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Request not found or already resolved." };

  await createNotification({
    userId: data.user_id,
    type: "support_request_resolved",
    title: `Update on your support request: ${data.subject}`,
    body: resolution.trim(),
    url: "/help",
  });

  await logAuditEvent({
    actor: session,
    action: "support_request.resolve",
    entityType: "support_request",
    entityId: requestId,
  });

  revalidatePath("/admin/support");
  return { ok: true };
}

export async function setUserAccountStatus(
  userId: string,
  status: "active" | "suspended"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (status !== "active" && status !== "suspended") {
    return { ok: false, error: "Invalid status." };
  }

  // Suspending yourself through this UI is never the intent -- it's either a
  // misclick or a real incident, and a real incident needs the out-of-band
  // dashboard path (see SECURITY.md) so the account doing the containing
  // can't accidentally contain itself.
  if (userId === session.userId) {
    return { ok: false, error: "You can't change your own account's status here." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("users").update({ status }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  // AUTH-01 (pre-launch audit, P0): a JWT already issued before this call
  // stays cryptographically valid until it naturally expires -- Supabase
  // Auth has no way to retroactively kill a live access token, and RLS
  // (migration 0095) is what actually closes that window in the meantime.
  // ban_duration is the other half: it stops the account getting a NEW
  // token (login or refresh) for as long as the suspension lasts, instead
  // of silently allowing that the moment the current token expires.
  await supabase.auth.admin.updateUserById(userId, {
    ban_duration: status === "suspended" ? "876000h" : "none",
  });

  await logAuditEvent({
    actor: session,
    action: status === "suspended" ? "account.suspend" : "account.reactivate",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/accounts");
  return { ok: true };
}

export interface OffboardResult {
  assignmentsEnded: number;
  supervisorAssignmentsEnded: number;
  bookingsCancelled: number;
  holdsReleased: number;
}

/**
 * E12, external PRD review. Distinct from setUserAccountStatus's suspend,
 * on purpose: suspension is a temporary, reversible hold (e.g. pending a
 * safeguarding investigation -- docs/safeguarding-procedure.md frames it as
 * "while it's looked into"); offboarding is the deliberate, permanent "this
 * therapist is no longer part of Hayven" case, and runs the full cascade a
 * plain suspend never touches:
 *
 *   - locks the account out (same mechanism setUserAccountStatus uses)
 *   - ends every active therapist_child_assignments row (ended_reason=
 *     'therapist_departed' -- getChildrenNeedingReassignment, src/lib/
 *     admin/queries.ts, filters on exactly this)
 *   - removes their supervisor-of-others access (ends supervisor_assignments
 *     where they're supervisor_id, clears is_supervisor) and tidies up any
 *     row where they were the one being supervised
 *   - cancels every future confirmed booking with a full refund queued for
 *     an admin to send, and releases every still-unpaid pending hold with
 *     no refund needed (cancelBookingsForDepartedTherapist, src/lib/
 *     booking/actions.ts), notifying each affected parent either way
 *
 * Deliberately does NOT touch clinical content -- goals/session notes/
 * reports stay attributed to them permanently (see migration 0093's
 * goals.therapist_id immutability trigger); a currently-assigned therapist
 * gains the ability to manage their now-orphaned goals going forward via
 * the RLS policy that same migration adds, not by rewriting who authored
 * them.
 */
export async function offboardTherapist(
  userId: string
): Promise<{ ok: true; result: OffboardResult } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (userId === session.userId) return { ok: false, error: "You can't offboard your own account here." };

  const supabase = createAdminClient();

  const { data: target } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "Account not found." };
  if (target.role !== "therapist") return { ok: false, error: "Only therapist accounts can be offboarded." };

  const { data: therapistProfile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!therapistProfile) return { ok: false, error: "This therapist hasn't finished setting up their profile." };

  const { error: statusError } = await supabase.from("users").update({ status: "suspended" }).eq("id", userId);
  if (statusError) return { ok: false, error: statusError.message };

  // AUTH-01 -- see setUserAccountStatus's comment; offboarding is
  // permanent, so this ban is never lifted the way a plain suspension's is.
  await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });

  const endedOn = new Date().toISOString().slice(0, 10);

  const { data: endedAssignments } = await supabase
    .from("therapist_child_assignments")
    .update({ status: "ended", ended_on: endedOn, ended_reason: "therapist_departed" })
    .eq("therapist_id", therapistProfile.id)
    .eq("status", "active")
    .select("id");

  const { data: endedSupervisorAssignments } = await supabase
    .from("supervisor_assignments")
    .update({ status: "ended", ended_on: endedOn })
    .eq("supervisor_id", userId)
    .eq("status", "active")
    .select("id");
  await supabase.from("users").update({ is_supervisor: false }).eq("id", userId);

  // Tidy, not an access concern -- they're gone either way, this just
  // closes out the record of who used to supervise them.
  await supabase
    .from("supervisor_assignments")
    .update({ status: "ended", ended_on: endedOn })
    .eq("therapist_id", therapistProfile.id)
    .eq("status", "active");

  const { cancelled: bookingsCancelled, holdsReleased } = await cancelBookingsForDepartedTherapist(
    supabase,
    therapistProfile.id
  );

  const result: OffboardResult = {
    assignmentsEnded: endedAssignments?.length ?? 0,
    supervisorAssignmentsEnded: endedSupervisorAssignments?.length ?? 0,
    bookingsCancelled,
    holdsReleased,
  };

  await logAuditEvent({
    actor: session,
    action: "account.offboard",
    entityType: "user",
    entityId: userId,
    metadata: { ...result },
  });

  revalidatePath("/admin/accounts");
  revalidatePath("/admin/users");

  return { ok: true, result };
}

export async function resetUserAccountPassword(
  userId: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  // Unlike setUserAccountStatus/setUserSupervisorFlag, this action had no
  // self/peer guard: any admin could set *any* account's password --
  // including another admin's -- to a value only they know, then log in as
  // them, with the target never notified (L-15, production audit
  // 2026-09-03). Block self (use the normal change-password flow) and block
  // targeting another admin account outright -- there's no legitimate
  // in-app reason to know a fellow admin's password; a genuinely locked-out
  // admin needs an out-of-band Supabase recovery link, not a peer setting
  // one they know.
  if (userId === session.userId) {
    return { ok: false, error: "You can't reset your own password here -- use the normal change-password flow." };
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("users").select("role, email, full_name").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "Account not found." };
  if (target.role === "admin") {
    return { ok: false, error: "Admin accounts can't be reset this way. Use a Supabase recovery link instead." };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { ok: false, error: error.message };

  // Never put the new password itself in the audit trail -- only that a
  // reset happened, who did it, and for whom.
  await logAuditEvent({
    actor: session,
    action: "account.reset_password",
    entityType: "user",
    entityId: userId,
  });

  // The target wasn't previously told this happened at all.
  await createNotification({
    userId,
    type: "verification_update",
    title: "Your password was reset",
    body: "A Hayven administrator reset your account password. If this wasn't expected, contact support immediately.",
  });

  return { ok: true };
}

/**
 * Grants or revokes supervisor access on a therapist account. This is
 * additive (users.is_supervisor), not a role change: a therapist keeps full
 * access to their own /therapist dashboard, caseload, schedule, and bookings
 * after being granted supervisor access, and separately gets in to
 * /supervisor -- see migration 0054, proxy.ts, and supervisor/layout.tsx,
 * which all key off the same (role === "therapist" && is_supervisor) check.
 *
 * Restricted to therapist-role accounts: a supervisor is meant to be an
 * experienced practitioner overseeing others, and every RLS function this
 * relies on (is_supervisor_of_therapist, is_supervised_child) already keys
 * off supervisor_assignments membership rather than the role/flag itself,
 * so nothing downstream needs the target to be anything other than a real
 * therapist.
 *
 * Revoking also ends every active supervisor_assignments row for this user:
 * a stale active row would keep RLS-level access alive even after the flag
 * itself is cleared.
 */
export async function setUserSupervisorFlag(
  userId: string,
  makeSupervisor: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  if (userId === session.userId) {
    return { ok: false, error: "You can't change your own account's role here." };
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("users").select("role, is_supervisor").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "Account not found." };

  if (target.role !== "therapist") {
    return { ok: false, error: "Only therapist accounts can be granted supervisor access." };
  }

  if (makeSupervisor) {
    if (target.is_supervisor) return { ok: true };

    const { error } = await supabase.from("users").update({ is_supervisor: true }).eq("id", userId);
    if (error) return { ok: false, error: error.message };

    await logAuditEvent({ actor: session, action: "account.grant_supervisor", entityType: "user", entityId: userId });
  } else {
    if (!target.is_supervisor) return { ok: true };

    const { error } = await supabase.from("users").update({ is_supervisor: false }).eq("id", userId);
    if (error) return { ok: false, error: error.message };

    const { error: endError } = await supabase
      .from("supervisor_assignments")
      .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10) })
      .eq("supervisor_id", userId)
      .eq("status", "active");
    if (endError) return { ok: false, error: endError.message };

    await logAuditEvent({ actor: session, action: "account.revoke_supervisor", entityType: "user", entityId: userId });
  }

  revalidatePath("/admin/accounts");
  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Approves or denies a therapist's self-submitted request for supervisor
 * access (supervisor_requests, see migration 0054). Approving reuses
 * setUserSupervisorFlag rather than duplicating the flag-set + audit-log
 * logic, so a request-approved grant and a direct admin-initiated grant stay
 * identical in every effect.
 */
export async function reviewSupervisorRequest(
  requestId: string,
  decision: "approved" | "denied"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { data: request, error } = await supabase
    .from("supervisor_requests")
    .update({ status: decision, admin_id: session.userId, reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id, therapist_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!request) return { ok: false, error: "Request not found or already reviewed." };

  if (decision === "approved") {
    const grantResult = await setUserSupervisorFlag(request.therapist_id, true);
    if (!grantResult.ok) {
      // The claim update above already flipped this request to "approved" --
      // undo that so it doesn't sit in a state where nothing was actually
      // granted. The request can be reviewed again once the underlying
      // issue (almost always: the account is no longer a therapist) is fixed.
      await supabase.from("supervisor_requests").update({ status: "pending", admin_id: null, reviewed_at: null }).eq("id", requestId);
      return grantResult;
    }
  }

  await createNotification({
    userId: request.therapist_id,
    type: decision === "approved" ? "supervisor_request_approved" : "supervisor_request_denied",
    title: decision === "approved" ? "You now have supervisor access" : "Your supervisor access request",
    body:
      decision === "approved"
        ? "An admin approved your request. You can now oversee therapists assigned to you from the Supervisor portal."
        : "An admin reviewed your request and it wasn't approved this time.",
    url: decision === "approved" ? "/supervisor" : "/therapist/profile",
  });

  await logAuditEvent({
    actor: session,
    action: `supervisor_request.${decision}`,
    entityType: "supervisor_request",
    entityId: requestId,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
