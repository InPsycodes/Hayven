import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GenerationHistoryInput, GenerationInput, GenerationSkillInput, ReportBody } from "./types";
import type { ToneContext } from "./generate";

export interface RealReport {
  id: string;
  status: string;
  therapistBody: ReportBody | null;
  parentBody: ReportBody | null;
  publishedAt: string | null;
}

/**
 * therapist_body/input_snapshot are select-revoked from `authenticated` (see
 * migration 0017) because a parent RLS row-policy can't restrict which
 * columns get returned -- so the one legitimate reader, the assigned
 * therapist's own session page, goes through the service-role client and
 * re-checks assignment itself instead of relying on grants/RLS at all.
 */
export async function getReportForSession(sessionId: string, therapistId: string): Promise<RealReport | null> {
  const admin = createAdminClient();
  const { data: therapySession } = await admin
    .from("therapy_sessions")
    .select("id, therapist_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession || therapySession.therapist_id !== therapistId) return null;

  const { data } = await admin
    .from("reports")
    .select("id, status, therapist_body, parent_body, published_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    therapistBody: data.therapist_body,
    parentBody: data.parent_body,
    publishedAt: data.published_at,
  };
}

/** Same shape and reasoning as getReportForSession -- a supervisor's read also has to go through the service-role client and re-check its own authorization, since therapist_body/input_snapshot are select-revoked from `authenticated` regardless of who's asking. */
export async function getReportForSessionAsSupervisor(sessionId: string, supervisorId: string): Promise<RealReport | null> {
  const admin = createAdminClient();
  const { data: therapySession } = await admin
    .from("therapy_sessions")
    .select("id, therapist_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession) return null;

  const { data: supervision } = await admin
    .from("supervisor_assignments")
    .select("id")
    .eq("supervisor_id", supervisorId)
    .eq("therapist_id", therapySession.therapist_id)
    .eq("status", "active")
    .maybeSingle();
  if (!supervision) return null;

  const { data } = await admin
    .from("reports")
    .select("id, status, therapist_body, parent_body, published_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    therapistBody: data.therapist_body,
    parentBody: data.parent_body,
    publishedAt: data.published_at,
  };
}

export interface PublishedParentReport {
  id: string;
  parentBody: ReportBody;
  publishedAt: string;
}

/** Parent-facing: only ever returns reports that have actually been published (RLS enforces this too). */
export async function getPublishedReportsForChild(childId: string): Promise<PublishedParentReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, parent_body, published_at")
    .eq("child_id", childId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  return (data ?? [])
    .filter((r) => r.parent_body && r.published_at)
    .map((r) => ({ id: r.id, parentBody: r.parent_body as ReportBody, publishedAt: r.published_at as string }));
}

export interface NeedsReportSession {
  id: string;
  childId: string;
  childFirstName: string;
  sessionDate: string;
}

export interface ReportWorkflowSummary {
  needsReportCount: number;
  needsReportSessions: NeedsReportSession[];
  draftCount: number;
  publishedCount: number;
}

/** Powers the therapist dashboard's documentation-workflow summary -- replaces the old booking-based "reports due" nudge. */
export async function getReportWorkflowSummary(therapistId: string): Promise<ReportWorkflowSummary> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("therapy_sessions")
    .select("id, child_id, session_date, children(first_name)")
    .eq("therapist_id", therapistId)
    .eq("status", "complete")
    .order("session_date", { ascending: true });

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: reports } = sessionIds.length
    ? await supabase.from("reports").select("session_id, status").in("session_id", sessionIds)
    : { data: [] as { session_id: string; status: string }[] };

  const reportBySession = new Map((reports ?? []).map((r) => [r.session_id, r.status]));

  const needsReportSessions = (sessions ?? [])
    .filter((s) => !reportBySession.has(s.id))
    .map((s) => ({
      id: s.id,
      childId: s.child_id,
      childFirstName: (s.children as unknown as { first_name: string } | null)?.first_name ?? "Unknown",
      sessionDate: s.session_date,
    }));

  const statuses = Array.from(reportBySession.values());
  const publishedCount = statuses.filter((s) => s === "published").length;
  const draftCount = statuses.length - publishedCount;

  return {
    needsReportCount: needsReportSessions.length,
    needsReportSessions: needsReportSessions.slice(0, 5),
    draftCount,
    publishedCount,
  };
}

/** Admin-added phrase variants for the given tone, grouped for direct use as a `ToneContext.extra` map. Runs under the caller's own session (RLS), not the service-role client -- report generation is a therapist action, and the table's select policy allows any authenticated read. */
export async function getPhraseVariants(tone: "warm" | "direct"): Promise<ToneContext["extra"]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_phrase_variants")
    .select("domain_key, band, phrase")
    .eq("tone", tone);

  const grouped = new Map<string, string[]>();
  for (const row of data ?? []) {
    const key = `${row.domain_key}:${row.band ?? "none"}`;
    const existing = grouped.get(key);
    if (existing) existing.push(row.phrase);
    else grouped.set(key, [row.phrase]);
  }
  return grouped;
}

function rawBehaviourValue(
  entry: { count: number | null; duration_seconds: number | null; intensity: number | null } | undefined,
  measurement: string
): number | null {
  if (!entry) return null;
  if (measurement === "duration" || measurement === "latency") return entry.duration_seconds;
  if (measurement === "intensity") return entry.intensity;
  return entry.count;
}

/**
 * The "what should we practice at home?" answer is stitched onto the end of
 * therapist_notes by stitchSessionNotes as a trailing `Home practice focus: …`
 * sentence. Pull it back out so the parent report can lead its own
 * "How you can help at home" section with it, rather than it only ever
 * appearing quoted inside the session narrative.
 */
function extractHomePractice(notes: string | null): string | null {
  if (!notes) return null;
  const marker = "Home practice focus: ";
  const idx = notes.lastIndexOf(marker);
  if (idx === -1) return null;
  const after = notes.slice(idx + marker.length).trim().replace(/\.+$/, "").trim();
  return after || null;
}

function perHour(raw: number | null, durationMinutes: number | null): number | null {
  if (raw === null || !durationMinutes) return null;
  return Math.round((raw / (durationMinutes / 60)) * 10) / 10;
}

function skillPercent(entry: { trials_total: number | null; trials_correct: number | null } | undefined): number | null {
  if (!entry || !entry.trials_total || entry.trials_correct === null) return null;
  return Math.round((entry.trials_correct / entry.trials_total) * 1000) / 10;
}

/** Gathers this session's recorded entries plus the prior completed session's, for delta comparisons. */
export async function getGenerationInput(sessionId: string): Promise<GenerationInput | null> {
  const supabase = await createClient();

  const { data: therapySession } = await supabase
    .from("therapy_sessions")
    .select(
      "id, child_id, session_date, duration_minutes, setting, therapist_notes, attendance, general_presentation, therapist_profiles(location, users(full_name))"
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!therapySession) return null;

  const therapistProfile = therapySession.therapist_profiles as unknown as {
    location: string | null;
    users: { full_name: string } | null;
  } | null;

  // This session and the completed sessions before it, newest first. Ordered
  // by date and then by when each was logged: a child can have two sessions
  // on one day (say speech in the morning, OT in the afternoon), and ordering
  // by date alone returned those in arbitrary order, so the trend chart could
  // end on the wrong session and "previous session" skipped a same-day one.
  // Same-day sessions logged after this one are dropped, so regenerating an
  // older report never pulls in later results.
  const HISTORY_LIMIT = 8;
  const { data: candidates } = await supabase
    .from("therapy_sessions")
    .select("id, session_date, duration_minutes, created_at")
    .eq("child_id", therapySession.child_id)
    .lte("session_date", therapySession.session_date)
    .or(`status.eq.complete,id.eq.${sessionId}`)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT * 2);
  const ordered = candidates ?? [];
  const selfIndex = ordered.findIndex((s) => s.id === sessionId);
  const upToThis = selfIndex === -1 ? [] : ordered.slice(selfIndex);
  const priorSession = upToThis[1] ?? null;

  const [
    { data: goals },
    { data: behaviours },
    { data: skills },
    { data: goalEntries },
    { data: priorGoalEntries },
    { data: behaviourEntries },
    { data: priorBehaviourEntries },
    { data: skillEntries },
    { data: priorSkillEntries },
    { data: reinforcers },
    { data: abcObservations },
  ] = await Promise.all([
    supabase.from("goals").select("id, title, domain").eq("child_id", therapySession.child_id),
    supabase.from("target_behaviours").select("id, label, parent_label, measurement, direction").eq("child_id", therapySession.child_id),
    supabase.from("skills").select("id, label, mastery_criteria, domain_type").eq("child_id", therapySession.child_id),
    supabase.from("session_goal_progress").select("goal_id, percent_complete, note").eq("session_id", sessionId),
    priorSession
      ? supabase.from("session_goal_progress").select("goal_id, percent_complete").eq("session_id", priorSession.id)
      : Promise.resolve({ data: [] as { goal_id: string; percent_complete: number }[] }),
    supabase
      .from("session_behaviour_entries")
      .select("target_behaviour_id, count, duration_seconds, intensity, antecedent, consequence")
      .eq("session_id", sessionId),
    priorSession
      ? supabase
          .from("session_behaviour_entries")
          .select("target_behaviour_id, count, duration_seconds, intensity")
          .eq("session_id", priorSession.id)
      : Promise.resolve({
          data: [] as { target_behaviour_id: string; count: number | null; duration_seconds: number | null; intensity: number | null }[],
        }),
    supabase
      .from("session_skill_entries")
      .select("skill_id, trials_total, trials_correct, prompt_level, structured_data, notes")
      .eq("session_id", sessionId),
    priorSession
      ? supabase.from("session_skill_entries").select("skill_id, trials_total, trials_correct").eq("session_id", priorSession.id)
      : Promise.resolve({ data: [] as { skill_id: string; trials_total: number | null; trials_correct: number | null }[] }),
    supabase.from("session_reinforcers").select("label, effectiveness").eq("session_id", sessionId),
    supabase
      .from("session_abc_observations")
      .select("behaviour_label, antecedent, antecedent_category, behaviour_observed, consequence, outcome")
      .eq("session_id", sessionId),
  ]);

  const goalRows = (goals ?? []).map((goal) => {
    const entry = (goalEntries ?? []).find((e) => e.goal_id === goal.id);
    const priorEntry = (priorGoalEntries ?? []).find((e) => e.goal_id === goal.id);
    return {
      id: goal.id,
      title: goal.title,
      domain: goal.domain,
      percentComplete: entry ? entry.percent_complete : null,
      previousPercentComplete: priorEntry ? priorEntry.percent_complete : null,
      note: entry?.note ?? null,
    };
  });

  const behaviourRows = (behaviours ?? []).map((behaviour) => {
    const entry = (behaviourEntries ?? []).find((e) => e.target_behaviour_id === behaviour.id);
    const priorEntry = (priorBehaviourEntries ?? []).find((e) => e.target_behaviour_id === behaviour.id);
    const rawValue = rawBehaviourValue(entry, behaviour.measurement);
    const priorRawValue = rawBehaviourValue(priorEntry, behaviour.measurement);
    return {
      id: behaviour.id,
      label: behaviour.label,
      parentLabel: behaviour.parent_label,
      measurement: behaviour.measurement,
      direction: behaviour.direction,
      rawValue,
      previousRawValue: priorRawValue,
      perHour: perHour(rawValue, therapySession.duration_minutes),
      previousPerHour: priorSession ? perHour(priorRawValue, priorSession.duration_minutes) : null,
      antecedent: entry?.antecedent ?? null,
      consequence: entry?.consequence ?? null,
    };
  });

  const skillRows = (skills ?? []).map((skill) => {
    const entry = (skillEntries ?? []).find((e) => e.skill_id === skill.id);
    const priorEntry = (priorSkillEntries ?? []).find((e) => e.skill_id === skill.id);
    return {
      id: skill.id,
      label: skill.label,
      masteryCriteria: skill.mastery_criteria,
      percentThisSession: skillPercent(entry),
      previousPercent: skillPercent(priorEntry),
      promptLevel: entry?.prompt_level ?? null,
      domainType: skill.domain_type as GenerationSkillInput["domainType"],
      structuredData: (entry?.structured_data as Record<string, unknown> | null) ?? null,
      notes: entry?.notes ?? null,
    };
  });

  // Recent-session window backing the report's progress bars + sparklines --
  // this session and up to seven completed sessions before it, oldest first.
  const histSessions = upToThis.slice(0, HISTORY_LIMIT).reverse();
  const histIds = histSessions.map((s) => s.id);

  const [{ data: histGoalEntries }, { data: histSkillEntries }, { data: histBehaviourEntries }] = await Promise.all([
    supabase.from("session_goal_progress").select("session_id, goal_id, percent_complete").in("session_id", histIds),
    supabase.from("session_skill_entries").select("session_id, skill_id, trials_total, trials_correct").in("session_id", histIds),
    supabase
      .from("session_behaviour_entries")
      .select("session_id, target_behaviour_id, count, duration_seconds, intensity")
      .in("session_id", histIds),
  ]);

  const history: GenerationHistoryInput = {
    sessionDates: histSessions.map((s) => s.session_date),
    goals: (goals ?? []).map((goal) => ({
      id: goal.id,
      values: histSessions.map((s) => {
        const e = (histGoalEntries ?? []).find((x) => x.session_id === s.id && x.goal_id === goal.id);
        return e ? e.percent_complete : null;
      }),
    })),
    skills: (skills ?? []).map((skill) => ({
      id: skill.id,
      values: histSessions.map((s) => {
        const e = (histSkillEntries ?? []).find((x) => x.session_id === s.id && x.skill_id === skill.id);
        return skillPercent(e);
      }),
    })),
    behaviours: (behaviours ?? []).map((behaviour) => ({
      id: behaviour.id,
      values: histSessions.map((s) => {
        const e = (histBehaviourEntries ?? []).find(
          (x) => x.session_id === s.id && x.target_behaviour_id === behaviour.id
        );
        return perHour(rawBehaviourValue(e, behaviour.measurement), s.duration_minutes);
      }),
    })),
  };

  return {
    session: {
      date: therapySession.session_date,
      durationMinutes: therapySession.duration_minutes,
      setting: therapySession.setting,
      therapistNotes: therapySession.therapist_notes,
      homePractice: extractHomePractice(therapySession.therapist_notes),
      attendance: therapySession.attendance,
      generalPresentation: therapySession.general_presentation,
      therapistName: therapistProfile?.users?.full_name ?? null,
      location: therapySession.setting === "in_person" ? (therapistProfile?.location ?? null) : null,
    },
    goals: goalRows,
    behaviours: behaviourRows,
    skills: skillRows,
    reinforcers: (reinforcers ?? []).map((r) => ({ label: r.label, effectiveness: r.effectiveness })),
    abcObservations: (abcObservations ?? []).map((o) => ({
      behaviourLabel: o.behaviour_label,
      antecedent: o.antecedent,
      antecedentCategory: o.antecedent_category,
      behaviourObserved: o.behaviour_observed,
      consequence: o.consequence,
      outcome: o.outcome,
    })),
    history,
  };
}
