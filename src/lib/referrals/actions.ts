"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail, renderNotificationEmail } from "@/lib/email/send";
import { logAuditEvent } from "@/lib/audit/log";

export type ReferralStatus = "received" | "family_contacted" | "assessment_scheduled" | "care_started";

export interface FormState {
  error?: string;
  field?: string;
  referenceCode?: string;
}

// Avoids 0/O/1/I/L, which get misread over phone or in a hurried email --
// the code is meant to be read back, not just copy-pasted.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateReferenceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const suffix = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `HYV-REF-${suffix}`;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Public, no-login submission from a referring clinician. Rate-limited by
 * their own contact (not an account -- there isn't one), so one address
 * can't be used to spam the form or the confirmation mailer.
 */
export async function submitReferral(_prevState: FormState, formData: FormData): Promise<FormState> {
  const childName = formData.get("childName");
  const childAgeRaw = formData.get("childAge");
  const parentContact = formData.get("parentContact");
  const referrerName = formData.get("referrerName");
  const referrerFacility = formData.get("referrerFacility");
  const referrerSpecialty = formData.get("referrerSpecialty");
  const referrerContact = formData.get("referrerContact");
  const additionalInfo = formData.get("additionalInfo");
  const reasonTags = formData.getAll("reasonTags").filter((v): v is string => typeof v === "string");

  if (typeof childName !== "string" || !childName.trim()) {
    return { error: "Enter the child's name.", field: "childName" };
  }
  const childAge = typeof childAgeRaw === "string" ? Number.parseInt(childAgeRaw, 10) : NaN;
  if (!Number.isInteger(childAge) || childAge < 0 || childAge > 25) {
    return { error: "Enter a valid age.", field: "childAge" };
  }
  if (typeof parentContact !== "string" || !parentContact.trim()) {
    return { error: "Enter a way to reach the parent or guardian.", field: "parentContact" };
  }
  if (typeof referrerName !== "string" || !referrerName.trim()) {
    return { error: "Enter your name.", field: "referrerName" };
  }
  if (typeof referrerContact !== "string" || !referrerContact.trim()) {
    return { error: "Enter a way to reach you.", field: "referrerContact" };
  }
  if (reasonTags.length === 0) {
    return { error: "Select at least one reason for the referral.", field: "reasonTags" };
  }

  const rateLimitOk = await checkRateLimit(`referral-submit:${referrerContact.trim().toLowerCase()}`, 10, 60 * 60);
  if (!rateLimitOk) {
    return { error: "Too many referrals submitted recently. Please wait a while and try again." };
  }

  const admin = createAdminClient();

  // Collision odds on a 5-char, 32-symbol code are astronomically low, but
  // the column is UNIQUE, so a real collision fails loudly rather than
  // silently overwriting -- retry a few times before giving up.
  let referenceCode = generateReferenceCode();
  let inserted: { id: string } | null = null;
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    if (attempt > 0) referenceCode = generateReferenceCode();
    const { data, error } = await admin
      .from("referrals")
      .insert({
        reference_code: referenceCode,
        child_name: childName.trim(),
        child_age: childAge,
        parent_contact: parentContact.trim(),
        referrer_name: referrerName.trim(),
        referrer_facility: typeof referrerFacility === "string" ? referrerFacility.trim() || null : null,
        referrer_specialty: typeof referrerSpecialty === "string" ? referrerSpecialty.trim() || null : null,
        referrer_contact: referrerContact.trim(),
        reason_tags: reasonTags,
        additional_info: typeof additionalInfo === "string" ? additionalInfo.trim() || null : null,
      })
      .select("id")
      .single();
    if (!error && data) inserted = data;
    else if (error && error.code !== "23505") {
      // Not a unique-violation -- retrying won't help.
      return { error: "Couldn't submit the referral. Please try again." };
    }
  }
  if (!inserted) {
    return { error: "Couldn't submit the referral. Please try again." };
  }

  if (looksLikeEmail(referrerContact.trim())) {
    await sendEmail({
      to: referrerContact.trim(),
      subject: `Referral received -- ${referenceCode}`,
      html: renderNotificationEmail(
        "Referral received",
        `Thanks, Dr. ${referrerName.trim()}. We'll reach out to ${childName.trim()}'s family within one business day. ` +
          `Your reference code is ${referenceCode} -- use it with this email address at hayven.com.ng/pediatricians/status to check progress any time.`
      ),
    });
  }

  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  for (const a of admins ?? []) {
    await createNotification({
      userId: a.id,
      type: "referral_new",
      title: `New referral: ${childName.trim()}`,
      body: `From Dr. ${referrerName.trim()}${referrerFacility && typeof referrerFacility === "string" ? ` (${referrerFacility.trim()})` : ""} -- ${reasonTags.join(", ")}.`,
      url: "/admin/referrals",
    });
  }

  return { referenceCode };
}

export interface ReferralListItem {
  referenceCode: string;
  childName: string;
  status: ReferralStatus;
  createdAt: string;
  statusUpdatedAt: string;
}

/**
 * Public lookup -- the reference code plus the referrer's own email is the
 * entire "auth" here, since there's no account. On any mismatch this
 * returns the same generic error regardless of which part was wrong, same
 * enumeration-safe shape as requestPasswordReset.
 *
 * Once that one code + email pair checks out, returns every referral tied
 * to that same referrer email -- lets a pediatrician who's referred more
 * than once see all of them without re-entering each code individually.
 * Deliberately not offered as an email-only lookup: a referrer's contact is
 * sometimes a shared clinic inbox, so the door into the full history stays
 * gated on proof of at least one real code, not just knowledge of the
 * address.
 */
export async function listReferralsForReferrer(
  referenceCode: string,
  email: string
): Promise<{ ok: true; results: ReferralListItem[] } | { ok: false; error: string }> {
  const code = referenceCode.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();
  if (!code || !cleanEmail) {
    return { ok: false, error: "Enter your reference code and email." };
  }

  const rateLimitOk = await checkRateLimit(`referral-status:${code}`, 10, 15 * 60);
  if (!rateLimitOk) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const { data: matched } = await admin
    .from("referrals")
    .select("referrer_contact")
    .eq("reference_code", code)
    .maybeSingle();

  if (!matched || matched.referrer_contact.trim().toLowerCase() !== cleanEmail) {
    return { ok: false, error: "We couldn't find a referral matching that code and email." };
  }

  const { data } = await admin
    .from("referrals")
    .select("reference_code, child_name, status, created_at, status_updated_at")
    .ilike("referrer_contact", cleanEmail)
    .order("created_at", { ascending: false });

  return {
    ok: true,
    results: (data ?? []).map((r) => ({
      referenceCode: r.reference_code,
      childName: r.child_name,
      status: r.status,
      createdAt: r.created_at,
      statusUpdatedAt: r.status_updated_at,
    })),
  };
}

const STATUS_EMAIL_COPY: Record<ReferralStatus, { subject: string; body: (childName: string) => string }> = {
  received: { subject: "Referral received", body: (c) => `We've received your referral for ${c}.` },
  family_contacted: {
    subject: "Family contacted",
    body: (c) => `We've reached out to ${c}'s family.`,
  },
  assessment_scheduled: {
    subject: "Assessment scheduled",
    body: (c) => `An assessment has been scheduled for ${c}.`,
  },
  care_started: {
    subject: "Care has started",
    body: (c) => `${c} has started care on Hayven. Thank you for the referral.`,
  },
};

/**
 * Admin-only. Advances (or corrects) a referral's status and emails the
 * referrer the same plain update they'd see on the public status page --
 * no clinical detail, matching the boundary that page itself enforces.
 */
export async function advanceReferralStatus(
  referralId: string,
  nextStatus: ReferralStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("referrals")
    .update({ status: nextStatus, status_updated_at: new Date().toISOString() })
    .eq("id", referralId)
    .select("child_name, referrer_contact")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Referral not found." };

  const copy = STATUS_EMAIL_COPY[nextStatus];
  if (looksLikeEmail(data.referrer_contact)) {
    await sendEmail({
      to: data.referrer_contact,
      subject: `${copy.subject} -- ${data.child_name}`,
      html: renderNotificationEmail(copy.subject, copy.body(data.child_name)),
    });
  }

  await logAuditEvent({
    actor: session,
    action: "referral.status_update",
    entityType: "referral",
    entityId: referralId,
    metadata: { status: nextStatus },
  });

  revalidatePath("/admin/referrals");
  return { ok: true };
}
