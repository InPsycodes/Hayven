"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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
