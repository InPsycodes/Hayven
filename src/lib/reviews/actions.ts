"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";

type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_BODY = 1500;

/**
 * Create or update the calling parent's review of a therapist. The
 * completed-session requirement is enforced by RLS (see 0065) -- this
 * action adds the shape checks and the friendly errors. Runs under the
 * parent's own session, not the service-role client, so RLS is the
 * authority.
 */
export async function submitReview(
  therapistId: string,
  rating: number,
  body: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to leave a review." };
  }

  const r = Math.round(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return { ok: false, error: "Pick a rating from 1 to 5 stars." };
  }
  const text = body.trim().slice(0, MAX_BODY) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("therapist_reviews").upsert(
    {
      therapist_id: therapistId,
      parent_id: session.userId,
      rating: r,
      body: text,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "parent_id,therapist_id" }
  );

  if (error) {
    // RLS rejection when there's no completed booking surfaces here.
    if (error.code === "42501" || /row-level security/i.test(error.message)) {
      return { ok: false, error: "You can review a therapist once you've had a completed session with them." };
    }
    return { ok: false, error: error.message };
  }

  await logAuditEvent({
    actor: session,
    action: "review.submit",
    entityType: "therapist",
    entityId: therapistId,
    metadata: { rating: r },
  });

  revalidatePath(`/therapists/${therapistId}`);
  revalidatePath("/search");
  return { ok: true };
}

export async function deleteMyReview(therapistId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("therapist_reviews")
    .delete()
    .eq("therapist_id", therapistId)
    .eq("parent_id", session.userId);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actor: session,
    action: "review.delete",
    entityType: "therapist",
    entityId: therapistId,
  });

  revalidatePath(`/therapists/${therapistId}`);
  revalidatePath("/search");
  return { ok: true };
}
