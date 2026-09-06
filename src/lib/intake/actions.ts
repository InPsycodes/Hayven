"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { CONSENT_TYPES, intakeIsSubstantial, type ConsentState, type ConsentType, type IntakeDetails } from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Keeps only known keys, trims strings, drops empties -- the client is trusted
 *  for shape but not for staying inside it. */
function cleanDetails(input: Record<string, unknown>): IntakeDetails {
  const ARRAY_KEYS = new Set(["concernAreas", "sensoryTriggers", "therapiesTried"]);
  const STRING_KEYS = new Set([
    "preferredName", "homeLanguages", "communicationLevel", "household",
    "therapyGoal", "concernOnset",
    "sensoryCalming", "sensorySeeking",
    "diagnoses", "medications", "allergies", "hearingVision", "pediatrician", "pediatricianPhone",
    "therapyDetails",
    "routineSleep", "routineNaps", "routineMeals", "routineScreen", "routineHardest",
    "schoolStatus", "schoolName", "schoolNotes", "schoolSupport",
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (ARRAY_KEYS.has(key) && Array.isArray(value)) {
      const items = value
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 40);
      if (items.length) out[key] = items;
    } else if (STRING_KEYS.has(key) && typeof value === "string") {
      const trimmed = value.trim().slice(0, 4000);
      if (trimmed) out[key] = trimmed;
    }
  }
  return out as IntakeDetails;
}

/**
 * Upserts the whole intake `details` payload for the parent's own child.
 * Called on autosave (debounced) and on the explicit Save button. RLS
 * (is_parent_of_child, 0058/0077) is the real gate on which child_id this
 * can target; the role check is the friendly-error pattern used throughout.
 */
export async function saveIntakeForm(
  childId: string,
  details: Record<string, unknown>
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent to save this." };
  }

  const clean = cleanDetails(details);
  const supabase = await createClient();
  const { error } = await supabase.from("intake_forms").upsert(
    { child_id: childId, details: clean, updated_at: new Date().toISOString() },
    { onConflict: "child_id" }
  );
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({ actor: session, action: "intake_form.save", entityType: "intake_form", childId });
  await maybeNotifyTherapist(childId, session.name);

  revalidatePath(`/parent/children/${childId}/intake`);
  revalidatePath(`/therapist/children/${childId}/intake`);
  revalidatePath("/parent");
  return { ok: true };
}

/**
 * Records a consent decision as a new history row (never an update), so a
 * previous decision stays on record with its timestamp.
 */
export async function recordIntakeConsent(
  childId: string,
  type: string,
  granted: boolean,
  detail?: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "parent") {
    return { ok: false, error: "You must be signed in as a parent." };
  }
  if (!CONSENT_TYPES.includes(type as ConsentType)) {
    return { ok: false, error: "Unknown consent type." };
  }

  const supabase = await createClient();
  // An intake_forms row must exist first (the consent table has no FK to it,
  // but the dashboards read them together) -- make sure there's a row.
  await supabase.from("intake_forms").upsert(
    { child_id: childId, updated_at: new Date().toISOString() },
    { onConflict: "child_id", ignoreDuplicates: true }
  );

  const { error } = await supabase.from("intake_consents").insert({
    child_id: childId,
    consent_type: type,
    granted,
    detail: type === "share_named" && detail?.trim() ? detail.trim().slice(0, 2000) : null,
    recorded_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actor: session,
    action: "intake_form.consent",
    entityType: "intake_form",
    childId,
    metadata: { type, granted },
  });
  await maybeNotifyTherapist(childId, session.name);

  revalidatePath(`/parent/children/${childId}/intake`);
  revalidatePath(`/therapist/children/${childId}/intake`);
  return { ok: true };
}

/**
 * Tells the assigned therapist(s) once the form carries real context (access
 * consent given + several sections complete). `intake_forms.therapist_
 * notified_at` guards against repeating. Service-role: cross-user delivery,
 * same as createNotification's own reads.
 */
async function maybeNotifyTherapist(childId: string, parentName: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: form } = await admin
      .from("intake_forms")
      .select("details, therapist_notified_at")
      .eq("child_id", childId)
      .maybeSingle();
    if (!form || form.therapist_notified_at) return;

    const { data: consentRows } = await admin
      .from("intake_consents")
      .select("consent_type, granted, detail, recorded_at")
      .eq("child_id", childId)
      .order("recorded_at", { ascending: false });
    const seen = new Set<string>();
    const consents: ConsentState[] = [];
    for (const r of consentRows ?? []) {
      if (seen.has(r.consent_type)) continue;
      seen.add(r.consent_type);
      consents.push({
        type: r.consent_type as ConsentType,
        granted: r.granted,
        detail: r.detail,
        recordedAt: r.recorded_at,
      });
    }

    if (!intakeIsSubstantial((form.details ?? {}) as IntakeDetails, consents)) return;

    const { data: assignments } = await admin
      .from("therapist_child_assignments")
      .select("therapist_profiles(user_id)")
      .eq("child_id", childId)
      .eq("status", "active");
    const therapistUserIds = (assignments ?? [])
      .map((a) => (a.therapist_profiles as unknown as { user_id: string } | null)?.user_id)
      .filter((id): id is string => Boolean(id));
    if (therapistUserIds.length === 0) return;

    const { data: child } = await admin.from("children").select("first_name").eq("id", childId).maybeSingle();
    const childName = child?.first_name ?? "your client";

    // Claim the notification slot before sending, so a burst of autosaves
    // can't each fire one.
    const { data: claimed } = await admin
      .from("intake_forms")
      .update({ therapist_notified_at: new Date().toISOString() })
      .eq("child_id", childId)
      .is("therapist_notified_at", null)
      .select("child_id")
      .maybeSingle();
    if (!claimed) return;

    for (const userId of therapistUserIds) {
      await createNotification({
        userId,
        type: "note_added",
        entityType: "intake_form",
        entityId: childId,
        title: `${childName}'s intake form is ready`,
        body: `${parentName} has filled in ${childName}'s intake form. Review it before your first session.`,
        url: `/therapist/children/${childId}/intake`,
      });
    }
  } catch (err) {
    console.error("intake therapist notification threw", childId, err);
  }
}
