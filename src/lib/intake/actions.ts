"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface IntakeFormInput {
  sensoryProfile: string;
  medicalHistory: string;
  consentSharing: string;
  homeRoutine: string;
}

/**
 * Upserts the parent's own child's intake form. RLS (0058) is the real
 * gate -- is_parent_of_child(child_id) both restricts which child_id this
 * can target and blocks a non-parent caller outright -- the session role
 * check here is the same friendly-error-instead-of-silent-RLS-failure
 * pattern used throughout this codebase, not the only enforcement.
 */
export async function saveIntakeForm(childId: string, input: IntakeFormInput): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to save this." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("intake_forms").upsert(
    {
      child_id: childId,
      sensory_profile: input.sensoryProfile.trim() || null,
      medical_history: input.medicalHistory.trim() || null,
      consent_sharing: input.consentSharing.trim() || null,
      home_routine: input.homeRoutine.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id" }
  );
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actor: session,
    action: "intake_form.save",
    entityType: "intake_form",
    childId,
  });

  revalidatePath(`/parent/children/${childId}/intake`);
  revalidatePath(`/therapist/children/${childId}/intake`);
  revalidatePath("/parent");
  return { ok: true };
}
