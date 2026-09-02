"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { formatNaira } from "@/data/format";
import type { DisputeResolution } from "@/lib/disputes/queries";

type Result = { ok: true } | { ok: false; error: string };

const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REASON = 2000;

/** Parent opens a dispute on one of their own past bookings, within 7 days. */
export async function openDispute(bookingId: string, reason: string): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent." };
  }
  const text = reason.trim();
  if (text.length < 10) {
    return { ok: false, error: "Please describe what went wrong (a sentence or two)." };
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, parent_id, status, availability_slots(start_time, end_time), cancelled_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.parent_id !== session.userId) {
    return { ok: false, error: "Booking not found." };
  }
  if (!["completed", "no_show", "cancelled"].includes(booking.status)) {
    return { ok: false, error: "You can only report a problem after a session has happened or been cancelled." };
  }

  const slot = booking.availability_slots as unknown as { start_time: string; end_time: string } | null;
  const reference = slot?.end_time ?? booking.cancelled_at ?? null;
  if (reference && Date.now() - new Date(reference).getTime() > DISPUTE_WINDOW_MS) {
    return { ok: false, error: "The 7-day window to report a problem with this session has passed. Contact Hayven support." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_disputes")
    .insert({ booking_id: bookingId, parent_id: session.userId, reason: text.slice(0, MAX_REASON) });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You already have an open report for this session." };
    if (error.code === "42P01") return { ok: false, error: "This isn't available yet. Please contact Hayven support." };
    return { ok: false, error: error.message };
  }

  // Hold this session's therapist payout while it's disputed.
  await admin.from("bookings").update({ payout_hold: true }).eq("id", bookingId);

  await logAuditEvent({ actor: session, action: "dispute.open", entityType: "booking", entityId: bookingId });

  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  for (const a of admins ?? []) {
    await createNotification({
      userId: a.id,
      type: "support_request_new",
      title: "New session dispute",
      body: `${session.name} reported a problem with a session. Review in the disputes queue.`,
      url: "/admin/disputes",
    });
  }

  revalidatePath("/parent/sessions");
  return { ok: true };
}

/** Admin resolves a dispute. A refund resolution records the amount on the
 *  dispute and the booking (the money is still moved via the refund queue). */
export async function resolveDispute(
  disputeId: string,
  resolution: DisputeResolution,
  note: string,
  refundAmount?: number
): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  const cleanNote = note.trim();
  if (!cleanNote) return { ok: false, error: "Add a short note explaining the outcome (the parent sees it)." };

  const isRefund = resolution === "full_refund" || resolution === "partial_refund";
  let refund: number | null = null;
  if (isRefund) {
    refund = Math.round(refundAmount ?? 0);
    if (!Number.isFinite(refund) || refund <= 0) {
      return { ok: false, error: "Enter the refund amount in naira." };
    }
  }

  const admin = createAdminClient();
  const { data: dispute } = await admin
    .from("booking_disputes")
    .select("id, booking_id, parent_id, status, bookings(children(first_name))")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return { ok: false, error: "Dispute not found." };
  if (dispute.status !== "open") return { ok: false, error: "This dispute is already resolved." };

  const { data: updated, error } = await admin
    .from("booking_disputes")
    .update({
      status: "resolved",
      resolution,
      resolution_note: cleanNote,
      refund_amount: refund,
      admin_id: session.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "This dispute is already resolved." };

  // Refund resolution: set the booking's refund amount so the refund queue
  // picks it up. Release the payout hold either way (the outcome is decided).
  const bookingPatch: Record<string, unknown> = { payout_hold: false };
  if (isRefund && refund !== null) bookingPatch.refund_amount = refund;
  await admin.from("bookings").update(bookingPatch).eq("id", dispute.booking_id);

  await logAuditEvent({
    actor: session,
    action: "dispute.resolve",
    entityType: "booking",
    entityId: dispute.booking_id,
    metadata: { resolution, refund },
  });

  const child = (dispute.bookings as unknown as { children: { first_name: string } | null } | null)?.children;
  const body = isRefund
    ? `Your report about ${child?.first_name ?? "your child"}'s session has been reviewed. A refund of ${formatNaira(
        refund ?? 0
      )} is being processed. ${cleanNote}`
    : `Your report about ${child?.first_name ?? "your child"}'s session has been reviewed. ${cleanNote}`;
  await createNotification({
    userId: dispute.parent_id,
    type: "support_request_resolved",
    title: "Your session report has an update",
    body,
    url: "/parent/sessions",
  });

  revalidatePath("/admin/disputes");
  revalidatePath("/parent/sessions");
  return { ok: true };
}
