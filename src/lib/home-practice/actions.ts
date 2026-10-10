"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { checkRateLimit } from "@/lib/rate-limit/check";
import { flagHomePracticeNoteForSafeguarding } from "@/lib/safeguarding/alerts";
import { lagosToday } from "./queries";
import { MAX_NOTE_LENGTH, type HomePracticeOutcome } from "./types";

type Result = { ok: true } | { ok: false; error: string };

const OUTCOMES: HomePracticeOutcome[] = ["good", "mixed", "hard"];

/**
 * The parent logs how today's try went. One try per activity per day:
 * logging again the same day updates it.
 */
export async function logHomePracticeTry(activityId: string, outcome: string, note: string): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "parent") return { ok: false, error: "Please sign in to log a try." };
  if (!OUTCOMES.includes(outcome as HomePracticeOutcome)) return { ok: false, error: "Choose how it went." };
  const cleanNote = note.trim();
  if (cleanNote.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Keep the note under ${MAX_NOTE_LENGTH} characters.` };
  }

  const allowed = await checkRateLimit(`home-practice:${session.userId}`, 60, 60 * 60);
  if (!allowed) return { ok: false, error: "You're logging very quickly. Please wait a few minutes." };

  const admin = createAdminClient();
  const { data: activity } = await admin
    .from("home_practice_activities")
    .select("id, child_id, status, children(parent_id)")
    .eq("id", activityId)
    .maybeSingle();
  const child = activity?.children as unknown as { parent_id: string } | null;
  if (!activity || !child || child.parent_id !== session.userId) {
    return { ok: false, error: "This activity couldn't be found." };
  }
  if (activity.status !== "active") {
    return { ok: false, error: "Your therapist has updated this activity. Refresh to see the latest." };
  }

  const { error } = await admin.from("home_practice_logs").upsert(
    {
      activity_id: activity.id,
      child_id: activity.child_id,
      logged_by: session.userId,
      logged_on: lagosToday(),
      outcome,
      note: cleanNote || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "activity_id,logged_on" }
  );
  if (error) return { ok: false, error: "Couldn't save that. Please try again." };

  if (cleanNote) {
    await flagHomePracticeNoteForSafeguarding({ actor: session, childId: activity.child_id, note: cleanNote });
  }

  revalidatePath("/parent");
  return { ok: true };
}

/**
 * The therapist decides what happens to one of their own activities:
 * "keep" carries it over their next session, "change" lets the next session
 * replace it (the default), "done" takes it off the family's list now.
 */
export async function setHomePracticeNextStep(activityId: string, step: string): Promise<Result> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };
  if (step !== "keep" && step !== "change" && step !== "done" && step !== "clear") {
    return { ok: false, error: "Unknown choice." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return { ok: false, error: "Finish setting up your profile first." };

  const admin = createAdminClient();
  const { data: activity } = await admin
    .from("home_practice_activities")
    .select("id, child_id, therapist_id, status")
    .eq("id", activityId)
    .maybeSingle();
  // Only the therapist who set an activity decides its fate.
  if (!activity || activity.therapist_id !== therapist.id) return { ok: false, error: "Activity not found." };
  if (activity.status !== "active") return { ok: false, error: "This activity has already been closed." };

  const update =
    step === "done"
      ? { status: "done", closed_at: new Date().toISOString(), next_step: null }
      : { next_step: step === "clear" ? null : step };
  const { error } = await admin.from("home_practice_activities").update(update).eq("id", activityId);
  if (error) return { ok: false, error: "Couldn't save that. Please try again." };

  revalidatePath(`/therapist/children/${activity.child_id}`);
  return { ok: true };
}
