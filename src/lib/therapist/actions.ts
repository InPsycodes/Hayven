"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { professionalBodyLabel } from "./professional-bodies";

export interface FormState {
  error?: string;
}

export async function saveCredentialsStep(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist to continue." };
  }

  const specialtyId = formData.get("specialtyId");
  const professionalBody = formData.get("professionalBody");
  const membershipNumber = formData.get("membershipNumber");
  const yearsPracticing = Number(formData.get("yearsPracticing"));
  const file = formData.get("file");

  if (typeof specialtyId !== "string" || !specialtyId) {
    return { error: "Please select your specialty." };
  }
  if (typeof professionalBody !== "string" || !professionalBody) {
    return { error: "Please select your professional body." };
  }
  if (typeof membershipNumber !== "string" || !membershipNumber.trim()) {
    return { error: "Please enter your membership or license number." };
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
    return { error: profileError?.message ?? "Couldn't save your profile. Please try again." };
  }

  const { error: specialtyError } = await supabase
    .from("therapist_specialties")
    .upsert(
      { therapist_id: profile.id, specialty_id: specialtyId },
      { onConflict: "therapist_id,specialty_id" }
    );
  if (specialtyError) {
    return { error: specialtyError.message };
  }

  if (file instanceof File && file.size > 0) {
    const path = `${session.userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("credentials")
      .upload(path, file, { upsert: false });
    if (uploadError) {
      return { error: `File upload failed: ${uploadError.message}` };
    }

    const { error: credentialError } = await supabase.from("credentials").insert({
      therapist_id: profile.id,
      document_type: "membership_id",
      file_url: path,
      issuing_body: professionalBodyLabel(professionalBody),
      membership_number: membershipNumber,
    });
    if (credentialError) {
      return { error: credentialError.message };
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

  const { data: profile, error } = await supabase
    .from("therapist_profiles")
    .update({
      bio,
      price_per_session: Math.round(price),
      location: typeof location === "string" && location.trim() ? location : null,
      session_types: sessionTypes,
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

  const startIso = new Date(`${date}T${startTime}:00Z`).toISOString();
  const endIso = new Date(`${date}T${endTime}:00Z`).toISOString();
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
