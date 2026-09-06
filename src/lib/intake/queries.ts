import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  CONSENT_TYPES,
  type ConsentState,
  type ConsentType,
  type IntakeDetails,
} from "./schema";

export interface RealIntakeForm {
  childId: string;
  details: IntakeDetails;
  consents: ConsentState[];
  updatedAt: string;
}

/**
 * RLS-scoped read: works for a parent reading their own child's form and for
 * an assigned therapist reading a client's, since 0058/0077's select policies
 * (is_parent_of_child / is_assigned_therapist) cover both. Returns null both
 * when nothing exists yet and when the caller isn't authorised, same "not
 * found" shape either way.
 */
export async function getIntakeFormForChild(childId: string): Promise<RealIntakeForm | null> {
  const supabase = await createClient();

  const [{ data: form }, { data: consentRows }] = await Promise.all([
    supabase
      .from("intake_forms")
      .select("child_id, details, updated_at")
      .eq("child_id", childId)
      .maybeSingle(),
    supabase
      .from("intake_consents")
      .select("consent_type, granted, detail, recorded_at")
      .eq("child_id", childId)
      .order("recorded_at", { ascending: false }),
  ]);

  // Latest row per consent type is the current state.
  const latest = new Map<ConsentType, ConsentState>();
  for (const row of consentRows ?? []) {
    const type = row.consent_type as ConsentType;
    if (!latest.has(type)) {
      latest.set(type, {
        type,
        granted: row.granted,
        detail: row.detail,
        recordedAt: row.recorded_at,
      });
    }
  }
  const consents: ConsentState[] = CONSENT_TYPES.map(
    (type) => latest.get(type) ?? { type, granted: false, detail: null, recordedAt: null }
  );

  if (!form) {
    // A form row that doesn't exist yet still shows any consent already
    // recorded (e.g. migrated from the old free-text field).
    if (!consentRows || consentRows.length === 0) return null;
    return { childId, details: {}, consents, updatedAt: new Date(0).toISOString() };
  }

  return {
    childId: form.child_id,
    details: (form.details ?? {}) as IntakeDetails,
    consents,
    updatedAt: form.updated_at,
  };
}
