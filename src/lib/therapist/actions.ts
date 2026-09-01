"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { lagosWallClockToUtcIso } from "@/data/format";
import { professionalBodyLabel } from "./professional-bodies";
import { scanFileForViruses } from "@/lib/uploads/scan-file";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";

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

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CREDENTIAL_FILE_BYTES) {
      return { ...echo, error: "File is too large. Please upload a file under 2.5MB." };
    }
    const extension = await detectSafeCredentialExtension(file);
    if (!extension) {
      return { ...echo, error: "Please upload a PDF, JPG, or PNG file." };
    }

    // Scanned before it ever touches storage -- fails closed, not open, if
    // the scan itself can't be completed.
    const scanResult = await scanFileForViruses(file);
    if (!scanResult.clean) {
      return { ...echo, error: scanResult.reason };
    }

    // Generated name, not the client-supplied file.name -- no path
    // traversal, no attacker-chosen extension, no collisions.
    const path = `${session.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const contentType = extension === "pdf" ? "application/pdf" : `image/${extension === "jpg" ? "jpeg" : extension}`;
    const { error: uploadError } = await supabase.storage
      .from("credentials")
      .upload(path, file, { upsert: false, contentType });
    if (uploadError) {
      return { ...echo, error: `File upload failed: ${uploadError.message}` };
    }

    const { error: credentialError } = await supabase.from("credentials").insert({
      therapist_id: profile.id,
      document_type: "membership_id",
      file_url: path,
      issuing_body: professionalBodyLabel(professionalBody),
      membership_number: membershipNumber,
    });
    if (credentialError) {
      return { ...echo, error: credentialError.message };
    }
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
