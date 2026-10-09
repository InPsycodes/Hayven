"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { lagosWallClockToUtcIso } from "@/data/format";
import { professionalBodyLabel } from "./professional-bodies";
import { scanFileForViruses } from "@/lib/uploads/scan-file";
import { resolveBankAccount } from "@/lib/payments/paystack";
import { bankName } from "@/lib/payments/nigerian-banks";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { logAuditEvent } from "@/lib/audit/log";
import { revalidateDiscoveryCache } from "@/lib/therapist/discovery";
import { createNotification } from "@/lib/notifications/create";
import { THERAPIST_AGREEMENT } from "@/content/therapist-agreement";
import { recordAgreementAcceptance } from "./agreement";

export interface FormState {
  error?: string;
  // Echoed back on error so the client can restore the two <Select>
  // dropdowns even if whatever re-render useActionState triggers resets
  // their local state -- the plain text <Input> fields survive that
  // re-render on their own (uncontrolled native DOM value), but Select's
  // displayed value doesn't, so it needs this same round-trip explicitly.
  specialtyId?: string;
  professionalBody?: string;
}

// Matches the virus-scan API's free-tier file-size limit -- every accepted
// credential upload must actually be scannable, not just under some
// separate, larger limit that would let bigger files bypass the scan.
const MAX_CREDENTIAL_FILE_BYTES = 2.5 * 1024 * 1024;

/**
 * Identifies a file by its actual leading bytes, not the client-reported
 * File.type -- a raw request (curl, devtools) can claim any Content-Type it
 * likes, so `accept=""` on the input and `file.type` are both just hints,
 * never a real boundary. Returns the safe extension to store it under, or
 * null if the content doesn't match a type we accept.
 */
async function detectSafeCredentialExtension(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const startsWith = (bytes: number[]) => bytes.every((b, i) => head[i] === b);

  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (startsWith([0xff, 0xd8, 0xff])) return "jpg"; // JPEG SOI marker
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png"; // PNG signature
  return null;
}

/**
 * Size-check, type-sniff, virus-scan, then store a credential file in the
 * private bucket. Shared by the signup credentials step (certificate +
 * insurance) and the later insurance-renewal upload.
 */
async function storeCredentialFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  if (file.size > MAX_CREDENTIAL_FILE_BYTES) {
    return { error: "File is too large. Please upload a file under 2.5MB." };
  }
  const extension = await detectSafeCredentialExtension(file);
  if (!extension) {
    return { error: "Please upload a PDF, JPG, or PNG file." };
  }

  // Scanned before it ever touches storage -- fails closed, not open, if
  // the scan itself can't be completed.
  const scanResult = await scanFileForViruses(file);
  if (!scanResult.clean) {
    return { error: scanResult.reason };
  }

  // Generated name, not the client-supplied file.name -- no path
  // traversal, no attacker-chosen extension, no collisions.
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const contentType = extension === "pdf" ? "application/pdf" : `image/${extension === "jpg" ? "jpeg" : extension}`;
  const { error: uploadError } = await supabase.storage
    .from("credentials")
    .upload(path, file, { upsert: false, contentType });
  if (uploadError) {
    return { error: `File upload failed: ${uploadError.message}` };
  }
  return { path };
}

/** Insurance cover must still be running; a YYYY-MM-DD string from <input type="date">. */
function parseCoverEndDate(raw: FormDataEntryValue | null): { date: string } | { error: string } {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { error: "Please enter the date your insurance cover ends." };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (raw <= today) {
    return { error: "That insurance cover has already ended. Please upload your current certificate." };
  }
  return { date: raw };
}

export async function saveCredentialsStep(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Extracted before any validation so every error return below can echo
  // them back, regardless of which check fails.
  const rawSpecialtyId = formData.get("specialtyId");
  const rawProfessionalBody = formData.get("professionalBody");
  const echo = {
    specialtyId: typeof rawSpecialtyId === "string" ? rawSpecialtyId : undefined,
    professionalBody: typeof rawProfessionalBody === "string" ? rawProfessionalBody : undefined,
  };

  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ...echo, error: "You must be signed in as a therapist to continue." };
  }

  // Each accepted file hits the virus-scan vendor's API (free-tier quota,
  // see MAX_CREDENTIAL_FILE_BYTES above) -- unthrottled retries here burn
  // that shared quota, not just this one account's storage.
  const rateLimitOk = await checkRateLimit(`credential-upload:${session.userId}`, 10, 15 * 60);
  if (!rateLimitOk) return { ...echo, error: "Too many attempts. Please try again in a few minutes." };

  const specialtyId = formData.get("specialtyId");
  const professionalBody = formData.get("professionalBody");
  const membershipNumber = formData.get("membershipNumber");
  const yearsPracticing = Number(formData.get("yearsPracticing"));
  const file = formData.get("file");

  if (typeof specialtyId !== "string" || !specialtyId) {
    return { ...echo, error: "Please select your specialty." };
  }
  if (typeof professionalBody !== "string" || !professionalBody) {
    return { ...echo, error: "Please select your professional body." };
  }
  if (typeof membershipNumber !== "string" || !membershipNumber.trim()) {
    return { ...echo, error: "Please enter your membership or license number." };
  }
  // Without this, professionalBody/membershipNumber above would be
  // collected but never persisted anywhere (the credentials insert only
  // happens inside the file-upload branch below) -- silently discarding
  // data the form presented as required, and leaving the admin
  // verification checklist's "membership number confirmed" item with
  // nothing to check against.
  if (!(file instanceof File) || file.size === 0) {
    return { ...echo, error: "Please upload your certificate or membership document." };
  }

  // Professional indemnity insurance is required at verification
  // (Therapist Agreement §7, decided 2026-10-09).
  const insuranceFile = formData.get("insuranceFile");
  const insurer = formData.get("insurer");
  const policyNumber = formData.get("policyNumber");
  if (typeof insurer !== "string" || !insurer.trim()) {
    return { ...echo, error: "Please enter your insurer's name." };
  }
  const coverEnd = parseCoverEndDate(formData.get("insuranceExpiresOn"));
  if ("error" in coverEnd) return { ...echo, error: coverEnd.error };
  if (!(insuranceFile instanceof File) || insuranceFile.size === 0) {
    return { ...echo, error: "Please upload your professional indemnity insurance certificate." };
  }

  // Only asked for once the agreement is adopted (src/content/therapist-agreement.ts).
  if (THERAPIST_AGREEMENT && formData.get("acceptAgreement") !== "on") {
    return { ...echo, error: "Please read and accept the Therapist Agreement to continue." };
  }

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("therapist_profiles")
    .upsert(
      {
        user_id: session.userId,
        years_practicing: Number.isFinite(yearsPracticing) ? yearsPracticing : null,
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (profileError || !profile) {
    return { ...echo, error: profileError?.message ?? "Couldn't save your profile. Please try again." };
  }

  const { error: specialtyError } = await supabase
    .from("therapist_specialties")
    .upsert(
      { therapist_id: profile.id, specialty_id: specialtyId },
      { onConflict: "therapist_id,specialty_id" }
    );
  if (specialtyError) {
    return { ...echo, error: specialtyError.message };
  }

  const stored = await storeCredentialFile(supabase, session.userId, file);
  if ("error" in stored) return { ...echo, error: stored.error };
  const { error: credentialError } = await supabase.from("credentials").insert({
    therapist_id: profile.id,
    document_type: "membership_id",
    file_url: stored.path,
    issuing_body: professionalBodyLabel(professionalBody),
    membership_number: membershipNumber,
  });
  if (credentialError) {
    return { ...echo, error: credentialError.message };
  }

  const storedInsurance = await storeCredentialFile(supabase, session.userId, insuranceFile);
  if ("error" in storedInsurance) return { ...echo, error: storedInsurance.error };
  const { error: insuranceError } = await supabase.from("credentials").insert({
    therapist_id: profile.id,
    document_type: "insurance",
    file_url: storedInsurance.path,
    issuing_body: insurer.trim(),
    membership_number: typeof policyNumber === "string" && policyNumber.trim() ? policyNumber.trim() : null,
    expires_on: coverEnd.date,
  });
  if (insuranceError) {
    return { ...echo, error: insuranceError.message };
  }

  if (THERAPIST_AGREEMENT) {
    await recordAgreementAcceptance(profile.id, THERAPIST_AGREEMENT.version);
  }

  redirect("/signup/profile");
}

export async function saveProfileStep(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist to continue." };
  }

  const bio = formData.get("bio");
  const price = Number(formData.get("price"));
  const location = formData.get("location");
  const inPerson = formData.get("inPerson") === "on";
  const virtual = formData.get("virtual") === "on";

  if (typeof bio !== "string" || !bio.trim()) {
    return { error: "Please add a short bio." };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Please enter a valid session price." };
  }
  if (!inPerson && !virtual) {
    return { error: "Select at least one session type." };
  }

  const sessionTypes: string[] = [];
  if (inPerson) sessionTypes.push("in_person");
  if (virtual) sessionTypes.push("virtual");

  const supabase = await createClient();

  // Step 3 of the onboarding wizard has no guard requiring step 2 (the
  // credentials step, where the therapist_profiles row is actually
  // created) to be done first -- it's directly reachable by URL. Without
  // this check, the update below matches zero rows and .single() throws a
  // raw Postgrest error ("Cannot coerce the result to a single JSON
  // object") straight into the form's error slot. Redirect back to the
  // step that actually creates the row instead of surfacing that.
  const { data: existingProfile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!existingProfile) {
    redirect("/signup/credentials");
  }

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_CREDENTIAL_FILE_BYTES) {
      return { error: "Photo is too large. Please upload an image under 10MB." };
    }
    const extension = await detectSafeCredentialExtension(photo);
    if (!extension || extension === "pdf") {
      return { error: "Please upload a JPG or PNG image for your photo." };
    }
    const path = `${session.userId}/${crypto.randomUUID()}.${extension}`;
    const contentType = extension === "jpg" ? "image/jpeg" : "image/png";
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, photo, { upsert: true, contentType });
    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }
    photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { data: profile, error } = await supabase
    .from("therapist_profiles")
    .update({
      bio,
      price_per_session: Math.round(price),
      location: typeof location === "string" && location.trim() ? location : null,
      session_types: sessionTypes,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq("user_id", session.userId)
    .select("id")
    .single();

  if (error || !profile) {
    return { error: error?.message ?? "Couldn't save your profile. Please try again." };
  }

  // "Submit for review" locks the application -- create a verification
  // request unless one is already open (matches the API spec: can't
  // resubmit until admin resolves the current request).
  const { data: existingRequest } = await supabase
    .from("verification_requests")
    .select("id")
    .eq("therapist_id", profile.id)
    .in("status", ["submitted", "in_review"])
    .maybeSingle();

  if (!existingRequest) {
    const { error: requestError } = await supabase
      .from("verification_requests")
      .insert({ therapist_id: profile.id, status: "submitted" });
    if (requestError) {
      return { error: requestError.message };
    }
  }

  redirect("/signup/complete");
}

/**
 * Edits a therapist's own bio/price/location/session-types/years-practicing
 * after onboarding -- unlike saveProfileStep (the onboarding wizard step this
 * mirrors), this never touches photo_url, never creates a verification
 * request, and never redirects. Explicit column allowlist: the RLS
 * "therapist manages own profile" policy is row-scoped only (user_id =
 * auth.uid()), not column-scoped, so verification_status/verified_badge_label
 * must never be reachable from here -- those stay admin-only.
 */
export async function updateTherapistProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist to update your profile." };
  }

  const bio = formData.get("bio");
  const price = Number(formData.get("price"));
  const location = formData.get("location");
  const yearsPracticing = formData.get("yearsPracticing");
  const inPerson = formData.get("inPerson") === "on";
  const virtual = formData.get("virtual") === "on";
  const reportToneRaw = formData.get("reportTone");
  const reportTone = reportToneRaw === "direct" ? "direct" : "warm";

  if (typeof bio !== "string" || !bio.trim()) {
    return { error: "Please add a short bio." };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Please enter a valid session price." };
  }
  if (!inPerson && !virtual) {
    return { error: "Select at least one session type." };
  }

  const sessionTypes: string[] = [];
  if (inPerson) sessionTypes.push("in_person");
  if (virtual) sessionTypes.push("virtual");

  const parsedYears = Number(yearsPracticing);

  const supabase = await createClient();
  const { error } = await supabase
    .from("therapist_profiles")
    .update({
      bio: bio.trim(),
      price_per_session: Math.round(price),
      location: typeof location === "string" && location.trim() ? location.trim() : null,
      session_types: sessionTypes,
      years_practicing: Number.isFinite(parsedYears) && parsedYears >= 0 ? parsedYears : null,
      report_tone: reportTone,
    })
    .eq("user_id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/therapist/profile");
  revalidateDiscoveryCache();
  return {};
}

export async function addAvailabilitySlot(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist." };
  }

  const date = formData.get("date");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  const sessionType = formData.get("sessionType");

  if (typeof date !== "string" || !date) return { error: "Please pick a date." };
  if (typeof startTime !== "string" || !startTime) return { error: "Please pick a start time." };
  if (typeof endTime !== "string" || !endTime) return { error: "Please pick an end time." };
  if (sessionType !== "in_person" && sessionType !== "virtual") {
    return { error: "Please choose a session type." };
  }

  const startIso = lagosWallClockToUtcIso(date, startTime);
  const endIso = lagosWallClockToUtcIso(date, endTime);
  if (new Date(endIso) <= new Date(startIso)) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .single();
  if (!profile) {
    return { error: "Finish setting up your profile before adding availability." };
  }

  const { error } = await supabase.from("availability_slots").insert({
    therapist_id: profile.id,
    start_time: startIso,
    end_time: endIso,
    session_type: sessionType,
    is_booked: false,
  });
  if (error) return { error: error.message };

  revalidatePath("/therapist/schedule");
  revalidateDiscoveryCache();
  return {};
}

export async function deleteAvailabilitySlot(
  slotId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { ok: false, error: "Not authorized." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("is_booked", false); // RLS also enforces ownership; this guards against deleting a booked slot

  if (error) return { ok: false, error: error.message };

  revalidatePath("/therapist/schedule");
  revalidateDiscoveryCache();
  return { ok: true };
}

/**
 * A therapist requests supervisor access; every admin is notified (in-app +
 * email) so it doesn't just sit unseen, same fanout shape as
 * submitSupportRequest. An admin approves/denies from /admin/users via
 * reviewSupervisorRequest, which is the only thing that actually grants
 * users.is_supervisor -- see migration 0054.
 */
export async function requestSupervisorAccess(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist to request this." };
  }

  const rateLimitOk = await checkRateLimit(`supervisor-request:${session.userId}`, 3, 60 * 60);
  if (!rateLimitOk) {
    return { error: "You've submitted several requests recently. Please wait a bit before submitting another." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("supervisor_requests")
    .select("id")
    .eq("therapist_id", session.userId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return {};
  }

  const note = formData.get("note");

  const { data, error } = await supabase
    .from("supervisor_requests")
    .insert({
      therapist_id: session.userId,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't submit your request. Please try again." };
  }

  await logAuditEvent({
    actor: session,
    action: "supervisor_request.submit",
    entityType: "supervisor_request",
    entityId: data.id,
  });

  const admin = createAdminClient();
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  for (const a of admins ?? []) {
    await createNotification({
      userId: a.id,
      type: "supervisor_request_new",
      title: `Supervisor access request: ${session.name}`,
      body: `${session.name} requested supervisor access.${note && typeof note === "string" && note.trim() ? ` Note: ${note.trim().slice(0, 200)}` : ""}`,
      url: "/admin/users",
    });
  }

  revalidatePath("/therapist/profile");
  return {};
}

/**
 * Replace a therapist's public profile photo after onboarding. Same upload
 * path as saveProfileStep's photo branch (public `avatars` bucket, magic-byte
 * extension check, no virus scan -- images only, and the bucket is
 * display-only) but standalone: no verification request, no redirect.
 */
export async function updateTherapistPhoto(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist." };
  }

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Choose an image first." };
  }
  if (photo.size > MAX_CREDENTIAL_FILE_BYTES) {
    return { error: "That image is too large. Please use one under 2.5MB." };
  }
  const extension = await detectSafeCredentialExtension(photo);
  if (!extension || extension === "pdf") {
    return { error: "Please upload a JPG or PNG image." };
  }

  const supabase = await createClient();
  const path = `${session.userId}/${crypto.randomUUID()}.${extension}`;
  const contentType = extension === "jpg" ? "image/jpeg" : "image/png";
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, photo, { upsert: true, contentType });
  if (uploadError) {
    return { error: `Photo upload failed: ${uploadError.message}` };
  }
  const photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

  const { error } = await supabase
    .from("therapist_profiles")
    .update({ photo_url: photoUrl })
    .eq("user_id", session.userId);
  if (error) return { error: error.message };

  revalidatePath("/therapist/profile");
  revalidatePath("/search");
  revalidateDiscoveryCache();
  return {};
}

/**
 * Save the therapist's payout bank account. The account number is resolved
 * against Paystack first so a typo can't strand a payout. Changing it
 * clears the cached Paystack recipient code -- the next payout run creates
 * a fresh one.
 */
export async function updateBankDetails(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist." };
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return { error: "Payouts aren't set up yet. Try again later." };
  }

  const bankCode = formData.get("bankCode");
  const accountNumber = formData.get("accountNumber");
  if (typeof bankCode !== "string" || !bankName(bankCode)) {
    return { error: "Choose your bank from the list." };
  }
  if (typeof accountNumber !== "string" || !/^\d{10}$/.test(accountNumber.trim())) {
    return { error: "Enter your 10-digit account number." };
  }

  let resolved;
  try {
    resolved = await resolveBankAccount(accountNumber.trim(), bankCode);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't verify that account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("therapist_profiles")
    .update({
      bank_code: bankCode,
      bank_account_number: resolved.accountNumber,
      bank_account_name: resolved.accountName,
      paystack_recipient_code: null,
    })
    .eq("user_id", session.userId);
  if (error) return { error: error.message };

  revalidatePath("/therapist/profile");
  revalidatePath("/search");
  revalidateDiscoveryCache();
  return {};
}

/**
 * Renewing (or first adding) professional indemnity insurance after
 * onboarding, from the therapist's profile page. Same scan/store path as
 * the signup step; a new credentials row each time, so the history of
 * cover is kept and getCurrentInsurance picks the latest end date.
 */
export async function uploadInsuranceCertificate(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist." };
  }
  const rateLimitOk = await checkRateLimit(`credential-upload:${session.userId}`, 10, 15 * 60);
  if (!rateLimitOk) return { error: "Too many attempts. Please try again in a few minutes." };

  const insuranceFile = formData.get("insuranceFile");
  const insurer = formData.get("insurer");
  const policyNumber = formData.get("policyNumber");
  if (typeof insurer !== "string" || !insurer.trim()) {
    return { error: "Please enter your insurer's name." };
  }
  const coverEnd = parseCoverEndDate(formData.get("insuranceExpiresOn"));
  if ("error" in coverEnd) return { error: coverEnd.error };
  if (!(insuranceFile instanceof File) || insuranceFile.size === 0) {
    return { error: "Please upload your insurance certificate." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!profile) return { error: "Finish setting up your profile first." };

  const stored = await storeCredentialFile(supabase, session.userId, insuranceFile);
  if ("error" in stored) return { error: stored.error };
  const { data: row, error } = await supabase
    .from("credentials")
    .insert({
      therapist_id: profile.id,
      document_type: "insurance",
      file_url: stored.path,
      issuing_body: insurer.trim(),
      membership_number: typeof policyNumber === "string" && policyNumber.trim() ? policyNumber.trim() : null,
      expires_on: coverEnd.date,
    })
    .select("id")
    .single();
  if (error || !row) return { error: error?.message ?? "Couldn't save your certificate. Please try again." };

  await logAuditEvent({
    actor: session,
    action: "credential.insurance_upload",
    entityType: "credential",
    entityId: row.id,
    metadata: { expiresOn: coverEnd.date },
  });

  revalidatePath("/therapist/profile");
  revalidatePath("/therapist");
  return {};
}

/** Accepting the current Therapist Agreement version from the dashboard prompt (after a material change, or for therapists who joined before it was adopted). */
export async function acceptTherapistAgreement(version: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };
  if (!THERAPIST_AGREEMENT || THERAPIST_AGREEMENT.version !== version) {
    return { ok: false, error: "The agreement has changed. Please reload the page." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!profile) return { ok: false, error: "Finish setting up your profile first." };

  if (!(await recordAgreementAcceptance(profile.id, version))) {
    return { ok: false, error: "Couldn't record your acceptance. Please try again." };
  }
  await logAuditEvent({
    actor: session,
    action: "therapist_agreement.accept",
    entityType: "therapist_profile",
    entityId: profile.id,
    metadata: { version },
  });

  revalidatePath("/therapist");
  return { ok: true };
}
