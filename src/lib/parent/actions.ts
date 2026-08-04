"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export interface FormState {
  error?: string;
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
    return { error: "Please enter a first name." };
  }
  if (typeof dateOfBirth !== "string" || !dateOfBirth) {
    return { error: "Please enter a date of birth." };
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
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/children");
  return {};
}
