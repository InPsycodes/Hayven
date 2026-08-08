import type { SessionSeriesWindow } from "./chart-queries";

function behaviourRawValue(
  entry: { count: number | null; durationSeconds: number | null; intensity: number | null } | undefined,
  measurement: string
): number | null {
  if (!entry) return null;
  if (measurement === "duration" || measurement === "latency") return entry.durationSeconds;
  if (measurement === "intensity") return entry.intensity;
  return entry.count; // frequency, percent
}

/** Count/duration per session, normalised per hour so session length doesn't skew the trend. */
export function toBehaviourFrequencySeries(
  w: SessionSeriesWindow,
  behaviourId: string
): { date: string; value: number | null }[] {
  const behaviour = w.behaviours.find((b) => b.id === behaviourId);
  if (!behaviour) return [];

  return w.sessions.map((session) => {
    const entry = w.behaviourEntries.find((e) => e.sessionId === session.id && e.behaviourId === behaviourId);
    const raw = behaviourRawValue(entry, behaviour.measurement);
    if (raw === null || !session.durationMinutes) return { date: session.sessionDate, value: null };
    const perHour = raw / (session.durationMinutes / 60);
    return { date: session.sessionDate, value: Math.round(perHour * 10) / 10 };
  });
}

/** Raw series plus a 3-session rolling average, for the "trend" chart. */
export function toBehaviourTrendSeries(
  w: SessionSeriesWindow,
  behaviourId: string
): { date: string; value: number | null; rollingAverage: number | null }[] {
  const raw = toBehaviourFrequencySeries(w, behaviourId);
  return raw.map((point, index) => {
    const window = raw.slice(Math.max(0, index - 2), index + 1).map((p) => p.value);
    const known = window.filter((v): v is number => v !== null);
    const rollingAverage = known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : null;
    return { ...point, rollingAverage };
  });
}

export function toSkillAcquisitionSeries(
  w: SessionSeriesWindow,
  skillId: string
): { date: string; percent: number | null }[] {
  return w.sessions.map((session) => {
    const entry = w.skillEntries.find((e) => e.sessionId === session.id && e.skillId === skillId);
    if (!entry || !entry.trialsTotal || entry.trialsCorrect === null) {
      return { date: session.sessionDate, percent: null };
    }
    return { date: session.sessionDate, percent: Math.round((entry.trialsCorrect / entry.trialsTotal) * 1000) / 10 };
  });
}

export function toGoalProgressMatrix(w: SessionSeriesWindow): { date: string; [goalId: string]: string | number | null }[] {
  return w.sessions.map((session) => {
    const row: { date: string; [goalId: string]: string | number | null } = { date: session.sessionDate };
    for (const goal of w.goals) {
      const entry = w.goalEntries.find((e) => e.sessionId === session.id && e.goalId === goal.id);
      row[goal.id] = entry ? entry.percentComplete : null;
    }
    return row;
  });
}

function isoWeekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
}

export function toAttendanceSeries(w: SessionSeriesWindow): { weekStart: string; sessions: number; minutes: number }[] {
  const byWeek = new Map<string, { sessions: number; minutes: number }>();
  for (const session of w.sessions) {
    const week = isoWeekStart(session.sessionDate);
    const existing = byWeek.get(week) ?? { sessions: 0, minutes: 0 };
    existing.sessions += 1;
    existing.minutes += session.durationMinutes ?? 0;
    byWeek.set(week, existing);
  }
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, v]) => ({ weekStart, ...v }));
}

export function toReinforcerEffectiveness(w: SessionSeriesWindow): { name: string; mean: number; uses: number }[] {
  const byLabel = new Map<string, number[]>();
  for (const r of w.reinforcers) {
    if (r.effectiveness === null) continue;
    const list = byLabel.get(r.label) ?? [];
    list.push(r.effectiveness);
    byLabel.set(r.label, list);
  }
  return Array.from(byLabel.entries())
    .map(([name, values]) => ({
      name,
      mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      uses: values.length,
    }))
    .sort((a, b) => b.mean - a.mean);
}
