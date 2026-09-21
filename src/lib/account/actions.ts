"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { checkRateLimit } from "@/lib/rate-limit/check";

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
 * Records a request only -- this doesn't delete anything itself. An admin
 * reviews it first (confirming it's genuinely from the account holder,
 * not a mistaken or malicious request); that review starts the 30-day
 * clock Privacy Policy Section 6 promises, after which the account's
 * personal data (not a parent's children's clinical records, or a
 * therapist's clients' records -- those carry their own, longer retention
 * obligations) is purged automatically. See src/lib/account/purge.ts and
 * src/lib/account/cron.ts (E3).
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

/** Submitting a support request notifies every admin (in-app + email, via
 * createNotification) so it doesn't just sit unseen -- an admin replies from
 * /admin/support, which notifies the requester back the same way. */
export async function submitSupportRequest(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in to contact support." };
  }

  const rateLimitOk = await checkRateLimit(`support_request:${session.userId}`, 5, 60 * 60);
  if (!rateLimitOk) {
    return { error: "You've submitted several requests recently. Please wait a bit before submitting another." };
  }

  const subject = formData.get("subject");
  const message = formData.get("message");
  if (typeof subject !== "string" || !subject.trim()) {
    return { error: "Please add a subject." };
  }
  if (typeof message !== "string" || !message.trim()) {
    return { error: "Please describe what's going on." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_requests")
    .insert({ user_id: session.userId, subject: subject.trim(), message: message.trim() })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't submit your request. Please try again." };
  }

  await logAuditEvent({
    actor: session,
    action: "support_request.submit",
    entityType: "support_request",
    entityId: data.id,
  });

  const admin = createAdminClient();
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  for (const a of admins ?? []) {
    await createNotification({
      userId: a.id,
      type: "support_request_new",
      title: `New support request: ${subject.trim()}`,
      body: `From ${session.name} (${session.role}): ${message.trim().slice(0, 200)}`,
      url: "/admin/support",
    });
  }

  revalidatePath("/help");
  return {};
}
