"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";

export type VerificationDecision = "approved" | "rejected" | "needs_more_info";

export async function reviewVerificationRequestReal(
  requestId: string,
  status: VerificationDecision,
  reviewerNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
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
    });
  }

  revalidatePath("/admin/verification");
  return { ok: true };
}

export type AccountDeletionDecision = "reviewed" | "actioned";

/**
 * Marks a request reviewed/actioned for tracking only -- this never deletes
 * the requester's actual data. Actually deleting a user (and whatever of
 * their children's clinical records that cascades into) stays a deliberate,
 * manual operation an admin does separately; this just records that it
 * happened.
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
 * Records that a refund was processed manually (Paystack dashboard, bank
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
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10) })
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

export async function assignSupervisorToTherapist(
  supervisorId: string,
  therapistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();

  // is_supervisor_of_therapist() only checks the assignment row + status, never the
  // target user's actual role -- so this table's own RLS wouldn't catch a bad id here.
  const { data: targetUser } = await supabase.from("users").select("role").eq("id", supervisorId).maybeSingle();
  if (targetUser?.role !== "supervisor") {
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
