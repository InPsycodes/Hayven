import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RealIntakeForm {
  childId: string;
  sensoryProfile: string | null;
  medicalHistory: string | null;
  consentSharing: string | null;
  homeRoutine: string | null;
  updatedAt: string;
}

export interface IntakeSectionStatus {
  key: "sensoryProfile" | "medicalHistory" | "consentSharing" | "homeRoutine";
  label: string;
  complete: boolean;
}

const SECTION_LABELS: Record<IntakeSectionStatus["key"], string> = {
  sensoryProfile: "Sensory profile",
  medicalHistory: "Medical history",
  consentSharing: "Consent & sharing",
  homeRoutine: "Home routine survey",
};

/**
 * RLS-scoped read -- works for both a parent reading their own child's form
 * and an assigned therapist reading a client's form, since 0058's two select
 * policies (is_parent_of_child / is_assigned_therapist) cover both cases.
 * Returns null both when no form exists yet and when the caller isn't
 * authorized -- same "not found" shape either way, nothing to disambiguate.
 */
export async function getIntakeFormForChild(childId: string): Promise<RealIntakeForm | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("intake_forms")
    .select("child_id, sensory_profile, medical_history, consent_sharing, home_routine, updated_at")
    .eq("child_id", childId)
    .maybeSingle();
  if (error || !data) return null;

  return {
    childId: data.child_id,
    sensoryProfile: data.sensory_profile,
    medicalHistory: data.medical_history,
    consentSharing: data.consent_sharing,
    homeRoutine: data.home_routine,
    updatedAt: data.updated_at,
  };
}

/** Per-section complete/due status, same shape the homepage's dashboard-preview mockup has always shown. */
export function intakeSectionStatuses(form: RealIntakeForm | null): IntakeSectionStatus[] {
  const keys: IntakeSectionStatus["key"][] = ["sensoryProfile", "medicalHistory", "consentSharing", "homeRoutine"];
  return keys.map((key) => ({
    key,
    label: SECTION_LABELS[key],
    complete: Boolean(form?.[key]?.trim()),
  }));
}
