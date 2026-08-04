"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

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

  revalidatePath("/admin/verification");
  return { ok: true };
}
