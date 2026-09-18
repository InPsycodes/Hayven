"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export interface FormState {
  error?: string;
  /** Which field the error belongs to, so the form can highlight + focus it. */
  field?: "firstName" | "dateOfBirth" | "presentingConcern" | "guardianConsent";
}

export async function addChild(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { error: "You must be signed in as a parent to add a child." };
  }

  const firstName = formData.get("firstName");
  const dateOfBirth = formData.get("dateOfBirth");
  const presentingConcern = formData.get("presentingConcern");

  if (typeof firstName !== "string" || !firstName.trim()) {
    return { error: "Please enter a first name.", field: "firstName" };
  }
  if (typeof dateOfBirth !== "string" || !dateOfBirth) {
    return { error: "Please enter a date of birth.", field: "dateOfBirth" };
  }
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) {
    return { error: "That date of birth doesn't look right.", field: "dateOfBirth" };
  }
  const now = new Date();
  if (dob.getTime() > now.getTime()) {
    return { error: "Date of birth cannot be in the future.", field: "dateOfBirth" };
  }
  const EARLIEST_PLAUSIBLE_YEARS = 25; // catches obvious mistakes (wrong century, fat-fingered year) without hardcoding a strict pediatric cutoff -- that's a product policy, not a data-integrity check.
  const earliestPlausible = new Date(now);
  earliestPlausible.setUTCFullYear(now.getUTCFullYear() - EARLIEST_PLAUSIBLE_YEARS);
  if (dob.getTime() < earliestPlausible.getTime()) {
    return { error: "That date of birth doesn't look right. Please double-check it.", field: "dateOfBirth" };
  }
  if (formData.get("guardianConsent") !== "on") {
    return {
      error: "Please confirm you're this child's parent or legal guardian to continue.",
      field: "guardianConsent",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("children").insert({
    parent_id: session.userId,
    first_name: firstName.trim(),
    date_of_birth: dateOfBirth,
    presenting_concern:
      typeof presentingConcern === "string" && presentingConcern.trim()
        ? presentingConcern.trim()
        : null,
    guardian_consent_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/children");
  return {};
}

