"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/log";
import { sendEmail, renderNotificationEmail } from "@/lib/email/send";
import { SITE_URL } from "@/lib/seo/metadata";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { emailFormatError } from "@/lib/validation/email";

export interface WaitlistState {
  error?: string;
  ok?: boolean;
}

/**
 * The /search launch panel's "tell me when" form (migration 0107). Public,
 * so it's rate-limited per address and idempotent: signing up twice is a
 * silent success, and the response never reveals whether an email was
 * already on the list.
 */
export async function joinLaunchWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const raw = formData.get("email");
  const specialty = formData.get("specialty");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  const formatError = emailFormatError(email);
  if (!email || formatError) return { error: formatError ?? "Please enter your email address." };
  if (email.length > 254) return { error: "That email address is too long." };

  const allowed = await checkRateLimit(`waitlist:${email}`, 5, 60 * 60);
  if (!allowed) return { error: "Please try again in a little while." };

  const { error } = await createAdminClient()
    .from("launch_waitlist")
    .upsert(
      { email, specialty: typeof specialty === "string" && specialty ? specialty.slice(0, 100) : null },
      { onConflict: "email", ignoreDuplicates: true }
    );
  if (error) {
    console.error("waitlist insert failed", error.message);
    return { error: "Couldn't save that just now. Please try again." };
  }
  return { ok: true };
}

const NOTIFY_BATCH = 50;
// Resend's default limit is 2 requests/second; stay under it.
const SEND_SPACING_MS = 600;

export type NotifyWaitlistResult = { ok: true; sent: number; remaining: number } | { ok: false; error: string };

/**
 * Admin-triggered "therapists are live" email to the launch waitlist.
 * Only allowed once at least one therapist is live in search. Each address
 * is claimed (notified_at set, conditional on it still being null) before
 * its email goes out, so a double-click or two admins at once can't send
 * anyone two emails. Works in batches of 50 (about 30s of sending) to stay inside one request;
 * the button shows what's left and can be pressed again.
 */
export async function notifyLaunchWaitlist(): Promise<NotifyWaitlistResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { count: live } = await admin.from("therapist_public_profiles").select("id", { count: "exact", head: true });
  if (!live) return { ok: false, error: "No therapist is live in search yet, so there's nothing to tell families about." };

  const { data: pending, error: selectError } = await admin
    .from("launch_waitlist")
    .select("id")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(NOTIFY_BATCH);
  if (selectError) return { ok: false, error: selectError.message };
  if (!pending || pending.length === 0) return { ok: true, sent: 0, remaining: 0 };

  const { data: claimed, error: claimError } = await admin
    .from("launch_waitlist")
    .update({ notified_at: new Date().toISOString() })
    .in(
      "id",
      pending.map((r) => r.id)
    )
    .is("notified_at", null)
    .select("email");
  if (claimError) return { ok: false, error: claimError.message };

  const html = renderNotificationEmail(
    "Therapists are now live on Hayven",
    "You asked us to let you know when therapists were available on Hayven. The first verified therapists are now live: each one is checked with their professional body and insured.\n\nYou can browse them, see their prices and open times, and book when you're ready. This is the only email we'll send you about it.",
    { actionUrl: `${SITE_URL}/search`, actionLabel: "Find a therapist" }
  );
  for (const [i, row] of (claimed ?? []).entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, SEND_SPACING_MS));
    await sendEmail({ to: row.email, subject: "Therapists are now live on Hayven", html });
  }

  const sent = claimed?.length ?? 0;
  await logAuditEvent({ actor: session, action: "waitlist.notify", entityType: "launch_waitlist", metadata: { sent } });

  const { count: remaining } = await admin
    .from("launch_waitlist")
    .select("id", { count: "exact", head: true })
    .is("notified_at", null);
  revalidatePath("/admin/overview");
  return { ok: true, sent, remaining: remaining ?? 0 };
}
