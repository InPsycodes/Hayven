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

/** Same fix as generate.ts's stripTrailingPeriod -- duplicated locally since it's a one-liner and this module has no reason to depend on lib/reports. */
function cleanSentence(text: string): string {
  return text.trim().replace(/\.+$/, "");
}

/**
 * Stitches the four guided session-notes prompts into one paragraph, in the
 * therapist's-own-shorthand register the "In the therapist's words" quote
 * already reads in (no repeated child name -- the wrapping report sentence
 * already names the child). Replaces one big free-text box specifically
 * because a rushed "good session" gives the generator nothing to work with;
 * guided prompts guarantee a complete paragraph every time. Empty prompts
 * are simply omitted, so an entirely-blank set still yields null, same as
 * today's "no notes recorded" fallback.
 */
function stitchSessionNotes(arrival: string | null, win: string | null, homework: string | null, other: string | null): string | null {
  const parts: string[] = [];
  if (arrival) parts.push(`Arrived: ${cleanSentence(arrival)}.`);
  if (win) parts.push(`Biggest win: ${cleanSentence(win)}.`);
  if (other) parts.push(`${cleanSentence(other)}.`);
  // Kept last, and always prefixed exactly "Home practice focus: ", so
  // getGenerationInput can split it back out into the parent report's own
  // "How you can help at home" section instead of it only ever surfacing
  // inside the session-narrative quote.
  if (homework) parts.push(`Home practice focus: ${cleanSentence(homework)}.`);
  return parts.length > 0 ? parts.join(" ") : null;
}

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
  const noteArrival = formData.get("noteArrival");
  const noteWin = formData.get("noteWin");
  const noteHomework = formData.get("noteHomework");
  const noteOther = formData.get("noteOther");
  const therapistNotes = stitchSessionNotes(
    typeof noteArrival === "string" && noteArrival.trim() ? noteArrival.trim() : null,
    typeof noteWin === "string" && noteWin.trim() ? noteWin.trim() : null,
    typeof noteHomework === "string" && noteHomework.trim() ? noteHomework.trim() : null,
    typeof noteOther === "string" && noteOther.trim() ? noteOther.trim() : null
  );
  const confidentialNote = formData.get("confidentialNote");
  const attendance = formData.get("attendance");
  const generalPresentation = formData.get("generalPresentation");

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
      therapist_notes: therapistNotes,
      confidential_note:
        typeof confidentialNote === "string" && confidentialNote.trim() ? confidentialNote.trim() : null,
      attendance: typeof attendance === "string" && attendance ? attendance : null,
      general_presentation:
        typeof generalPresentation === "string" && generalPresentation.trim() ? generalPresentation.trim() : null,
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

  function textField(name: string): string | null {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function numberField(name: string): number | null {
    const value = textField(name);
    if (value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function buildStructuredData(skillId: string, domainType: string | null): Record<string, unknown> | null {
    if (domainType === "name_response") {
      const orientation = numberField(`skill_${skillId}_nr_orientation`);
      const approach = numberField(`skill_${skillId}_nr_approach`);
      if (orientation === null && approach === null) return null;
      return { orientationPercent: orientation, approachPercent: approach };
    }
    if (domainType === "speech_approximation") {
      const wordOrSound = textField(`skill_${skillId}_sa_word`);
      const approximation = textField(`skill_${skillId}_sa_approximation`);
      if (wordOrSound === null && approximation === null) return null;
      return { wordOrSound, approximation };
    }
    if (domainType === "functional_communication") {
      const requests = textField(`skill_${skillId}_fc_requests`);
      if (requests === null) return null;
      return { requestsObserved: requests.split(",").map((r) => r.trim()).filter(Boolean) };
    }
    if (domainType === "communicative_initiation") {
      const gaze = numberField(`skill_${skillId}_ci_gaze`);
      const vocalization = numberField(`skill_${skillId}_ci_vocalization`);
      const gesture = numberField(`skill_${skillId}_ci_gesture`);
      if (gaze === null && vocalization === null && gesture === null) return null;
      return { gazePercent: gaze, vocalizationPercent: vocalization, gesturePercent: gesture };
    }
    if (domainType === "receptive_instructions") {
      const instruction = textField(`skill_${skillId}_ri_instruction`);
      const accuracy = numberField(`skill_${skillId}_ri_accuracy`);
      if (instruction === null && accuracy === null) return null;
      return { instruction, accuracyPercent: accuracy };
    }
    if (domainType === "object_identification") {
      const items = textField(`skill_${skillId}_oi_items`);
      const accuracy = numberField(`skill_${skillId}_oi_accuracy`);
      if (items === null && accuracy === null) return null;
      return { itemsCorrectlyIdentified: items, accuracyPercent: accuracy };
    }
    if (domainType === "concept_understanding") {
      const concept = textField(`skill_${skillId}_cu_concept`);
      const accuracy = numberField(`skill_${skillId}_cu_accuracy`);
      if (concept === null && accuracy === null) return null;
      return { concept, accuracyPercent: accuracy };
    }
    if (domainType === "tacting_naming") {
      const items = textField(`skill_${skillId}_tn_items`);
      const accuracy = numberField(`skill_${skillId}_tn_accuracy`);
      if (items === null && accuracy === null) return null;
      return {
        itemsLabelled: items ? items.split(",").map((i) => i.trim()).filter(Boolean) : [],
        accuracyPercent: accuracy,
      };
    }
    if (domainType === "mand_diversity") {
      const words = textField(`skill_${skillId}_md_words`);
      if (words === null) return null;
      return { newRequestWords: words.split(",").map((w) => w.trim()).filter(Boolean) };
    }
    if (domainType === "motor_speech_dttc") {
      const practised = textField(`skill_${skillId}_ms_practised`);
      const performance = textField(`skill_${skillId}_ms_performance`);
      if (practised === null && performance === null) return null;
      return {
        soundsWordsPractised: practised ? practised.split(",").map((s) => s.trim()).filter(Boolean) : [],
        performance,
      };
    }
    if (domainType === "functional_independence") {
      const activity = textField(`skill_${skillId}_fi_activity`);
      const communicationUsed = formData.getAll(`skill_${skillId}_fi_communication`).filter(
        (v): v is string => typeof v === "string"
      );
      const independenceLevel = textField(`skill_${skillId}_fi_independence`);
      if (!activity && communicationUsed.length === 0 && !independenceLevel) return null;
      return { activity, communicationUsed, independenceLevel };
    }
    return null;
  }

  const skillRows = programme.skills
    .map((skill) => {
      const notes = textField(`skill_${skill.id}_notes`);

      if (skill.domainType) {
        const structuredData = buildStructuredData(skill.id, skill.domainType);
        const prompt = formData.get(`skill_${skill.id}_prompt`);
        if (structuredData === null && notes === null) return null;
        return {
          session_id: sessionId,
          skill_id: skill.id,
          trials_total: null,
          trials_correct: null,
          prompt_level: typeof prompt === "string" && prompt ? prompt : null,
          structured_data: structuredData,
          notes,
        };
      }

      const totalNum = numberField(`skill_${skill.id}_total`);
      const correctNum = numberField(`skill_${skill.id}_correct`);
      const prompt = formData.get(`skill_${skill.id}_prompt`);
      if (totalNum === null || correctNum === null) return null;
      return {
        session_id: sessionId,
        skill_id: skill.id,
        trials_total: Math.round(totalNum),
        trials_correct: Math.min(Math.round(correctNum), Math.round(totalNum)),
        prompt_level: typeof prompt === "string" && prompt ? prompt : null,
        structured_data: null,
        notes,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const abcCount = Number(formData.get("abcCount")) || 0;
  const abcRows = Array.from({ length: abcCount })
    .map((_, i) => {
      const behaviourLabel = textField(`abc_${i}_behaviourLabel`);
      if (!behaviourLabel) return null;
      const antecedentCategory = textField(`abc_${i}_antecedentCategory`);
      return {
        session_id: sessionId,
        behaviour_label: behaviourLabel,
        antecedent: textField(`abc_${i}_antecedent`),
        antecedent_category: antecedentCategory,
        behaviour_observed: textField(`abc_${i}_behaviourObserved`),
        consequence: textField(`abc_${i}_consequence`),
        outcome: textField(`abc_${i}_outcome`),
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
    abcRows.length ? supabase.from("session_abc_observations").insert(abcRows) : null,
    ...parentLabelUpdates.map((row) =>
      supabase.from("target_behaviours").update({ parent_label: row.parentLabel }).eq("id", row.id)
    ),
  ]);
  const firstError = results.find((r) => r?.error);
  if (firstError?.error) {
    return { error: `Session saved, but some entries failed: ${firstError.error.message}` };
  }

  // Keep skills.current_percent in sync with the latest generic (non-domain-typed) entry for it.
  await Promise.all(
    skillRows
      .filter((row) => row.trials_total !== null && row.trials_correct !== null)
      .map((row) =>
        supabase
          .from("skills")
          .update({ current_percent: Math.round((row.trials_correct! / row.trials_total!) * 1000) / 10 })
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
