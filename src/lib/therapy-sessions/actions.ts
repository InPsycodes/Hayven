"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { logAuditEvent } from "@/lib/audit/log";
import { getChildProgramme } from "./queries";

export interface FormState {
  error?: string;
}

const REINFORCER_SLOTS = 3;

export async function createTherapySession(
  childId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "therapist") {
    return { error: "You must be signed in as a therapist." };
  }

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) {
    return { error: "Finish setting up your profile before logging a session." };
  }

  const supabase = await createClient();

  // Defense in depth -- RLS (is_assigned_therapist) also enforces this.
  const { data: assignment } = await supabase
    .from("therapist_child_assignments")
    .select("id")
    .eq("child_id", childId)
    .eq("therapist_id", therapist.id)
    .eq("status", "active")
    .maybeSingle();
  if (!assignment) {
    return { error: "You're not assigned to this child." };
  }

  const sessionDate = formData.get("sessionDate");
  const durationMinutes = Number(formData.get("durationMinutes"));
  const setting = formData.get("setting");
  const therapistNotes = formData.get("therapistNotes");
  const confidentialNote = formData.get("confidentialNote");

  if (typeof sessionDate !== "string" || !sessionDate) {
    return { error: "Please pick a session date." };
  }
  if (setting !== "in_person" && setting !== "virtual") {
    return { error: "Please choose a setting." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { error: "Please enter the session duration in minutes." };
  }

  const { data: newSession, error: sessionError } = await supabase
    .from("therapy_sessions")
    .insert({
      child_id: childId,
      therapist_id: therapist.id,
      session_date: sessionDate,
      duration_minutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? Math.round(durationMinutes) : null,
      setting,
      status: "complete",
      therapist_notes: typeof therapistNotes === "string" && therapistNotes.trim() ? therapistNotes.trim() : null,
      confidential_note:
        typeof confidentialNote === "string" && confidentialNote.trim() ? confidentialNote.trim() : null,
    })
    .select("id")
    .single();

  if (sessionError || !newSession) {
    return { error: sessionError?.message ?? "Couldn't create the session. Please try again." };
  }

  const sessionId = newSession.id;
  const programme = await getChildProgramme(childId);

  const behaviourRows = programme.targetBehaviours
    .map((behaviour) => {
      const field = formData.get(`behaviour_${behaviour.id}_value`);
      const value = typeof field === "string" && field.trim() ? Number(field) : null;
      if (value === null || !Number.isFinite(value)) return null;

      const antecedent = formData.get(`behaviour_${behaviour.id}_antecedent`);
      const consequence = formData.get(`behaviour_${behaviour.id}_consequence`);

      return {
        session_id: sessionId,
        target_behaviour_id: behaviour.id,
        count: behaviour.measurement === "frequency" || behaviour.measurement === "percent" ? Math.round(value) : null,
        duration_seconds:
          behaviour.measurement === "duration" || behaviour.measurement === "latency" ? Math.round(value) : null,
        intensity: behaviour.measurement === "intensity" ? Math.round(value) : null,
        antecedent: typeof antecedent === "string" && antecedent.trim() ? antecedent.trim() : null,
        consequence: typeof consequence === "string" && consequence.trim() ? consequence.trim() : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const parentLabelUpdates = programme.targetBehaviours
    .map((behaviour) => {
      const field = formData.get(`behaviour_${behaviour.id}_parent_label`);
      const raw = typeof field === "string" ? field.trim() : "";
      const parentLabel = raw ? raw : null;
      // Covers both setting/changing a name and intentionally clearing one back out.
      if (parentLabel === (behaviour.parentLabel ?? null)) return null;
      return { id: behaviour.id, parentLabel };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const skillRows = programme.skills
    .map((skill) => {
      const total = formData.get(`skill_${skill.id}_total`);
      const correct = formData.get(`skill_${skill.id}_correct`);
      const prompt = formData.get(`skill_${skill.id}_prompt`);
      const totalNum = typeof total === "string" && total.trim() ? Number(total) : null;
      const correctNum = typeof correct === "string" && correct.trim() ? Number(correct) : null;
      if (totalNum === null || correctNum === null || !Number.isFinite(totalNum) || !Number.isFinite(correctNum)) {
        return null;
      }
      return {
        session_id: sessionId,
        skill_id: skill.id,
        trials_total: Math.round(totalNum),
        trials_correct: Math.min(Math.round(correctNum), Math.round(totalNum)),
        prompt_level: typeof prompt === "string" && prompt ? prompt : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const goalRows = programme.goals
    .map((goal) => {
      const percent = formData.get(`goal_${goal.id}_percent`);
      const percentNum = typeof percent === "string" && percent.trim() ? Number(percent) : null;
      if (percentNum === null || !Number.isFinite(percentNum)) return null;
      return {
        session_id: sessionId,
        goal_id: goal.id,
        percent_complete: Math.min(100, Math.max(0, Math.round(percentNum))),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const reinforcerRows = Array.from({ length: REINFORCER_SLOTS })
    .map((_, i) => {
      const label = formData.get(`reinforcer_${i}_label`);
      const effectiveness = formData.get(`reinforcer_${i}_effectiveness`);
      if (typeof label !== "string" || !label.trim()) return null;
      const effNum = typeof effectiveness === "string" && effectiveness.trim() ? Number(effectiveness) : null;
      return {
        session_id: sessionId,
        label: label.trim(),
        effectiveness: effNum !== null && Number.isFinite(effNum) ? Math.round(effNum) : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const results = await Promise.all([
    behaviourRows.length ? supabase.from("session_behaviour_entries").insert(behaviourRows) : null,
    skillRows.length ? supabase.from("session_skill_entries").insert(skillRows) : null,
    goalRows.length ? supabase.from("session_goal_progress").insert(goalRows) : null,
    reinforcerRows.length ? supabase.from("session_reinforcers").insert(reinforcerRows) : null,
    ...parentLabelUpdates.map((row) =>
      supabase.from("target_behaviours").update({ parent_label: row.parentLabel }).eq("id", row.id)
    ),
  ]);
  const firstError = results.find((r) => r?.error);
  if (firstError?.error) {
    return { error: `Session saved, but some entries failed: ${firstError.error.message}` };
  }

  // Keep skills.current_percent in sync with the latest entry for it.
  await Promise.all(
    skillRows.map((row) =>
      supabase
        .from("skills")
        .update({ current_percent: Math.round((row.trials_correct / row.trials_total) * 1000) / 10 })
        .eq("id", row.skill_id)
    )
  );

  await logAuditEvent({
    actor: session,
    action: "session_note.create",
    entityType: "therapy_session",
    entityId: sessionId,
    childId,
  });

  redirect(`/therapist/children/${childId}/sessions/${sessionId}`);
}
