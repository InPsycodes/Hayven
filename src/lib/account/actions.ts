"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/log";

export interface FormState {
  error?: string;
}

export async function updateAccountProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in to update your profile." };
  }

  const fullName = formData.get("fullName");
  const phone = formData.get("phone");

  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Please enter your full name." };
  }

  const supabase = await createClient();
  // Explicit column allowlist -- the RLS "users can update own profile" policy
  // is row-scoped only (id = auth.uid()), not column-scoped, so this update
  // must never spread raw formData/JSON into .update() or a user's own
  // client could write to role/status. Same discipline as 0029's signup fix.
  const { error } = await supabase
    .from("users")
    .update({
      full_name: fullName.trim(),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    })
    .eq("id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/profile");
  revalidatePath("/parent");
  revalidatePath("/therapist/profile");
  revalidatePath("/therapist");
  return {};
}

/**
 * Records a request only -- this never deletes any data itself. An admin
 * reviews the request and handles the actual deletion manually and
 * separately, since it likely cascades into records still in active use
 * (a parent's children, or a therapist's clients), and health data can
 * carry retention obligations independent of what the account holder wants
 * gone.
 */
export async function requestAccountDeletion(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in to request account deletion." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("account_deletion_requests")
    .select("id")
    .eq("user_id", session.userId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return {};
  }

  const reason = formData.get("reason");

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .insert({
      user_id: session.userId,
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't submit the request. Please try again." };
  }

  await logAuditEvent({
    actor: session,
    action: "account_deletion_request.submit",
    entityType: "account_deletion_request",
    entityId: data.id,
  });

  revalidatePath("/parent/profile");
  revalidatePath("/therapist/profile");
  return {};
}
