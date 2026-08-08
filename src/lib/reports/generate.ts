import type {
  GenerationBehaviourInput,
  GenerationGoalInput,
  GenerationInput,
  GenerationSkillInput,
  ReportBlock,
  ReportBody,
  ReportSection,
} from "./types";

const CHILD = "{{CHILD}}";

function formatSetting(setting: string | null): string {
  if (setting === "in_person") return "in-person";
  if (setting === "virtual") return "virtual";
  return "unspecified-setting";
}

// ---------------------------------------------------------------------------
// session_summary
// ---------------------------------------------------------------------------

function buildSessionSummary(input: GenerationInput): ReportSection {
  const { session } = input;
  const duration = session.durationMinutes ? `${session.durationMinutes}-minute` : "";
  const blocks: ReportBlock[] = [
    {
      type: "paragraph",
      text: `${CHILD} attended a ${duration ? duration + " " : ""}${formatSetting(session.setting)} session on ${session.date}.`.replace(
        "  ",
        " "
      ),
    },
  ];

  if (session.therapistNotes && session.therapistNotes.trim()) {
    blocks.push({ type: "quote", label: "Therapist's session note", text: session.therapistNotes.trim() });
  } else {
    blocks.push({ type: "paragraph", text: "No additional session notes were recorded." });
  }

  return { key: "session_summary", heading: "Session summary", blocks };
}

// ---------------------------------------------------------------------------
// clinical_observations
// ---------------------------------------------------------------------------

const MEASURE_PHRASE: Record<string, (raw: number) => string> = {
  frequency: (raw) => `occurred ${raw} time${raw === 1 ? "" : "s"}`,
  duration: (raw) => `totalled ${raw} second${raw === 1 ? "" : "s"}`,
  intensity: (raw) => `was rated ${raw} on the 1-5 intensity scale`,
  percent: (raw) => `occurred in ${raw}% of observed intervals`,
  latency: (raw) => `showed a latency of ${raw} second${raw === 1 ? "" : "s"}`,
};

function rawDeltaPhrase(raw: number, previousRaw: number | null): string {
  if (previousRaw === null) return "";
  if (raw === previousRaw) return ", consistent with the prior session";
  return raw > previousRaw ? `, up from ${previousRaw} last time` : `, down from ${previousRaw} last time`;
}

function behaviourObservation(b: GenerationBehaviourInput): string {
  const phrase = MEASURE_PHRASE[b.measurement] ?? ((raw: number) => `was recorded at ${raw}`);
  let sentence = `${b.label} ${phrase(b.rawValue as number)} this session${rawDeltaPhrase(b.rawValue as number, b.previousRawValue)}.`;
  if (b.antecedent) sentence += ` Antecedent: ${b.antecedent}.`;
  if (b.consequence) sentence += ` Consequence: ${b.consequence}.`;
  return sentence;
}

function buildClinicalObservations(input: GenerationInput): ReportSection {
  const recorded = input.behaviours.filter((b) => b.rawValue !== null);

  if (recorded.length === 0) {
    return {
      key: "clinical_observations",
      heading: "Clinical observations",
      blocks: [{ type: "paragraph", text: "No target behaviours were recorded for this session." }],
    };
  }

  const blocks: ReportBlock[] = [];
  if (recorded.length > 1) {
    blocks.push({ type: "paragraph", text: `${recorded.length} target behaviours were monitored this session.` });
  }
  for (const b of recorded) {
    blocks.push({ type: "paragraph", text: behaviourObservation(b) });
  }

  return { key: "clinical_observations", heading: "Clinical observations", blocks };
}

// ---------------------------------------------------------------------------
// data_summary
// ---------------------------------------------------------------------------

function formatDelta(current: number | null, previous: number | null): string {
  if (current === null) return "not recorded";
  if (previous === null) return "no prior session";
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return "no change";
  return delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`;
}

function trendOf(
  current: number | null,
  previous: number | null,
  direction: "increase" | "decrease" = "increase"
): "positive" | "negative" | "neutral" {
  if (current === null || previous === null || current === previous) return "neutral";
  const increased = current > previous;
  const good = direction === "decrease" ? !increased : increased;
  return good ? "positive" : "negative";
}

function buildDataSummary(input: GenerationInput): ReportSection {
  const rows: string[][] = [];
  const rowGroups: string[] = [];
  const rowTrends: ("positive" | "negative" | "neutral")[] = [];

  for (const goal of input.goals) {
    if (goal.percentComplete === null) continue;
    rows.push([
      goal.title,
      `${goal.percentComplete}%`,
      goal.previousPercentComplete !== null ? `${goal.previousPercentComplete}%` : "-",
      formatDelta(goal.percentComplete, goal.previousPercentComplete),
    ]);
    rowGroups.push("Goals");
    rowTrends.push(trendOf(goal.percentComplete, goal.previousPercentComplete));
  }

  for (const skill of input.skills) {
    if (skill.percentThisSession === null) continue;
    rows.push([
      skill.label,
      `${skill.percentThisSession}%`,
      skill.previousPercent !== null ? `${skill.previousPercent}%` : "-",
      formatDelta(skill.percentThisSession, skill.previousPercent),
    ]);
    rowGroups.push("Skills");
    rowTrends.push(trendOf(skill.percentThisSession, skill.previousPercent));
  }

  for (const behaviour of input.behaviours) {
    if (behaviour.perHour === null) continue;
    rows.push([
      behaviour.label,
      `${behaviour.perHour}/hr`,
      behaviour.previousPerHour !== null ? `${behaviour.previousPerHour}/hr` : "-",
      formatDelta(behaviour.perHour, behaviour.previousPerHour),
    ]);
    rowGroups.push("Behaviours (rate per hour)");
    rowTrends.push(trendOf(behaviour.perHour, behaviour.previousPerHour, behaviour.direction));
  }

  if (rows.length === 0) {
    return {
      key: "data_summary",
      heading: "Data summary",
      blocks: [{ type: "paragraph", text: "No measurable data was recorded for this session." }],
    };
  }

  return {
    key: "data_summary",
    heading: "Data summary",
    blocks: [
      {
        type: "data_table",
        columns: ["Measure", "This session", "Previous session", "Change"],
        rows,
        rowGroups,
        rowTrends,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// clinical_interpretation -- the phrase bank. Every sentence here is
// reviewed, fixed copy selected by magnitude/direction; nothing is composed
// at request time beyond slotting in the child placeholder, a label, and a
// number already present in the input.
// ---------------------------------------------------------------------------

function goalInterpretation(goal: GenerationGoalInput): string | null {
  if (goal.percentComplete === null) return null;
  const delta = goal.previousPercentComplete === null ? null : goal.percentComplete - goal.previousPercentComplete;

  if (delta === null) {
    return `${goal.title}: first recorded data point at ${goal.percentComplete}% complete. No trend is available yet.`;
  }
  if (delta >= 15) {
    return `${goal.title}: ${CHILD} showed meaningful progress this session, up ${delta} points to ${goal.percentComplete}% complete.`;
  }
  if (delta >= 5) {
    return `${goal.title}: steady progress, up ${delta} points to ${goal.percentComplete}% complete.`;
  }
  if (delta > -5) {
    return `${goal.title}: holding at ${goal.percentComplete}% complete, no meaningful change since the last session.`;
  }
  return `${goal.title}: down ${Math.abs(delta)} points to ${goal.percentComplete}% complete since the last session. Worth reviewing what changed.`;
}

function skillInterpretation(skill: GenerationSkillInput): string | null {
  if (skill.percentThisSession === null) return null;
  const delta = skill.previousPercent === null ? null : skill.percentThisSession - skill.previousPercent;
  const masteryNote = skill.percentThisSession >= 90 ? " -- consistently demonstrating this skill." : skill.percentThisSession >= 80 ? " -- trending toward the mastery criterion." : "";

  if (delta === null) {
    return `${skill.label}: first recorded data point at ${skill.percentThisSession}% independent.${masteryNote}`;
  }
  if (delta >= 10) {
    return `${skill.label}: clear improvement, up ${delta} points to ${skill.percentThisSession}% independent.${masteryNote}`;
  }
  if (delta > -10) {
    return `${skill.label}: stable at ${skill.percentThisSession}% independent.${masteryNote}`;
  }
  return `${skill.label}: down ${Math.abs(delta)} points to ${skill.percentThisSession}% independent since the last session.`;
}

function behaviourInterpretation(behaviour: GenerationBehaviourInput): string | null {
  if (behaviour.perHour === null) return null;
  const delta = behaviour.previousPerHour === null ? null : behaviour.perHour - behaviour.previousPerHour;

  if (delta === null) {
    return `${behaviour.label}: first recorded data point at ${behaviour.perHour}/hr.`;
  }

  const improving = behaviour.direction === "decrease" ? delta < 0 : delta > 0;
  const worsening = behaviour.direction === "decrease" ? delta > 0 : delta < 0;

  if (Math.abs(delta) < 0.5) {
    return `${behaviour.label}: stable at ${behaviour.perHour}/hr since the last session.`;
  }
  if (improving) {
    return `${behaviour.label}: moving in the desired direction, now ${behaviour.perHour}/hr (previously ${behaviour.previousPerHour}/hr).`;
  }
  if (worsening) {
    return `${behaviour.label}: now ${behaviour.perHour}/hr (previously ${behaviour.previousPerHour}/hr), which may warrant closer monitoring.`;
  }
  return `${behaviour.label}: now ${behaviour.perHour}/hr (previously ${behaviour.previousPerHour}/hr).`;
}

function goalDomainLabel(domain: string | null): string {
  if (domain === "communication") return "Communication";
  if (domain === "behaviour" || domain === "behavior") return "Behaviour regulation";
  return "Other goals";
}

const DOMAIN_ORDER = ["Communication", "Other goals", "Behaviour regulation", "Skill acquisition"];

function buildClinicalInterpretation(input: GenerationInput): ReportSection {
  const buckets = new Map<string, string[]>();
  const pushTo = (label: string, sentence: string | null) => {
    if (!sentence) return;
    buckets.set(label, [...(buckets.get(label) ?? []), sentence]);
  };

  for (const goal of input.goals) pushTo(goalDomainLabel(goal.domain), goalInterpretation(goal));
  for (const behaviour of input.behaviours) pushTo("Behaviour regulation", behaviourInterpretation(behaviour));
  for (const skill of input.skills) pushTo("Skill acquisition", skillInterpretation(skill));

  if (buckets.size === 0) {
    return {
      key: "clinical_interpretation",
      heading: "Clinical interpretation",
      blocks: [{ type: "paragraph", text: "Not enough recorded data this session to support an interpretation." }],
    };
  }

  const blocks: ReportBlock[] = DOMAIN_ORDER.filter((label) => buckets.has(label)).map((label) => ({
    type: "paragraph",
    label,
    text: (buckets.get(label) ?? []).join(" "),
  }));

  return { key: "clinical_interpretation", heading: "Clinical interpretation", blocks };
}

// ---------------------------------------------------------------------------
// recommendations -- a small fixed set of safe, generic actions, never a new
// clinical direction. Deduplicated; falls back to a default if nothing
// triggers a specific recommendation.
// ---------------------------------------------------------------------------

function buildRecommendations(input: GenerationInput): ReportSection {
  const items = new Set<string>();

  for (const goal of input.goals) {
    if (goal.percentComplete === null) continue;
    if (goal.percentComplete >= 80) {
      items.add(`Consider planning for mastery transition on "${goal.title}."`);
    }
  }

  for (const skill of input.skills) {
    if (skill.percentThisSession !== null && skill.percentThisSession >= 80) {
      items.add(`Continue fading prompts on "${skill.label}" toward independence.`);
    }
    if (skill.previousPercent !== null && skill.percentThisSession !== null && skill.percentThisSession < skill.previousPercent - 10) {
      items.add(`Review recent changes that may have affected "${skill.label}."`);
    }
  }

  for (const behaviour of input.behaviours) {
    if (behaviour.perHour === null || behaviour.previousPerHour === null) continue;
    const worsening = behaviour.direction === "decrease" ? behaviour.perHour > behaviour.previousPerHour : behaviour.perHour < behaviour.previousPerHour;
    if (worsening) {
      items.add(`Consider reviewing antecedent triggers for "${behaviour.label}" and adjusting the current strategy.`);
    }
  }

  if (items.size === 0) {
    items.add("Continue implementing the current program as outlined.");
  }

  return { key: "recommendations", heading: "Recommendations", blocks: [{ type: "bullets", items: Array.from(items) }] };
}

// ---------------------------------------------------------------------------
// Parent-facing report -- same rule-based approach and the same computed
// numbers as the therapist report, but no raw counts, no antecedent/
// consequence detail, and no percentages: everything is translated into a
// small set of warm, plain-language phrases. This mirrors the tone already
// established in components/session-report/parent-summary-generator.ts.
// ---------------------------------------------------------------------------

/** Deterministic variant selection: same id always yields the same phrasing, but different goals/skills/behaviours (and different children) don't all read identically. */
function pickVariant<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return options[hash % options.length];
}

/** The parent-facing name for a behaviour: the therapist's own plain-language phrasing if they've set one, otherwise the clinical label as a fallback. */
function behaviourParentName(b: GenerationBehaviourInput): string {
  return b.parentLabel && b.parentLabel.trim() ? b.parentLabel.trim() : b.label.toLowerCase();
}

function goalHighlight(goal: GenerationGoalInput): string | null {
  if (goal.percentComplete === null) return null;
  const delta = goal.previousPercentComplete === null ? null : goal.percentComplete - goal.previousPercentComplete;
  const name = goal.title.toLowerCase();

  if (delta === null) {
    return pickVariant(
      [`We started working on ${name} this session.`, `This session introduced ${name} as a focus area.`],
      goal.id
    );
  }
  if (delta >= 15) {
    return pickVariant(
      [
        `${CHILD} made wonderful progress on ${name} this session.`,
        `${CHILD} took a real step forward on ${name} today.`,
        `Today was a strong one for ${name} -- real progress.`,
      ],
      goal.id
    );
  }
  if (delta >= 5) {
    return pickVariant(
      [
        `${CHILD} continued making steady progress on ${name}.`,
        `${name.charAt(0).toUpperCase()}${name.slice(1)} keeps moving in the right direction, one session at a time.`,
      ],
      goal.id
    );
  }
  if (delta > -5) {
    return pickVariant(
      [
        `${CHILD} kept steady with ${name}, no big change either way.`,
        `${name.charAt(0).toUpperCase()}${name.slice(1)} held about the same as last time, which is normal between bigger jumps.`,
      ],
      goal.id
    );
  }
  return pickVariant(
    [
      `${name.charAt(0).toUpperCase()}${name.slice(1)} was a bit tougher this session, which happens sometimes. We're staying consistent with our approach.`,
      `Today was a harder day for ${name}. That's a normal part of the process, and we're not changing our approach because of one session.`,
    ],
    goal.id
  );
}

function skillHighlight(skill: GenerationSkillInput): string | null {
  if (skill.percentThisSession === null) return null;
  const delta = skill.previousPercent === null ? null : skill.percentThisSession - skill.previousPercent;
  const name = skill.label.toLowerCase();

  if (delta === null) {
    return pickVariant(
      [`We started practising ${name} this session.`, `This session, we introduced practice on ${name}.`],
      skill.id
    );
  }
  if (delta >= 10) {
    return pickVariant(
      [
        `${CHILD} is getting noticeably more confident with ${name}.`,
        `Real progress on ${name} today -- ${CHILD} needed less help than usual.`,
      ],
      skill.id
    );
  }
  if (delta > -10) {
    return pickVariant(
      [
        `${CHILD} continued practising ${name} at a steady pace.`,
        `${name.charAt(0).toUpperCase()}${name.slice(1)} is progressing steadily, nothing dramatic, just consistent practice.`,
      ],
      skill.id
    );
  }
  return pickVariant(
    [
      `${name.charAt(0).toUpperCase()}${name.slice(1)} needed a bit more support today than usual, which is a normal part of learning.`,
      `${CHILD} found ${name} a little harder today. That happens, and it's not a step backward overall.`,
    ],
    skill.id
  );
}

function behaviourFocusNote(b: GenerationBehaviourInput): string | null {
  if (b.perHour === null) return null;
  const delta = b.previousPerHour === null ? null : b.perHour - b.previousPerHour;
  const name = behaviourParentName(b);

  if (delta === null) {
    return pickVariant([`We're keeping track of ${name} as part of the session routine.`], b.id);
  }

  const improving = b.direction === "decrease" ? delta < 0 : delta > 0;
  const worsening = b.direction === "decrease" ? delta > 0 : delta < 0;

  if (Math.abs(delta) < 0.5) {
    return pickVariant(
      [
        `We're continuing to work on ${name}, holding steady from last time.`,
        `${name.charAt(0).toUpperCase()}${name.slice(1)} stayed about the same as last session.`,
      ],
      b.id
    );
  }
  if (improving) {
    return pickVariant(
      [
        `We saw an improvement with ${name} this session compared to last time.`,
        `Good news on ${name}: this session was better than last time.`,
      ],
      b.id
    );
  }
  if (worsening) {
    return pickVariant(
      [
        `${name.charAt(0).toUpperCase()}${name.slice(1)} came up a little more than usual this session. We're staying consistent with our strategy and keeping an eye on it.`,
        `We saw a bit more of ${name} today than usual. That can happen, we're not changing our approach, just staying consistent.`,
      ],
      b.id
    );
  }
  return pickVariant([`We're continuing to work on ${name}.`], b.id);
}

function buildGreeting(input: GenerationInput): ReportSection {
  const { session } = input;
  const duration = session.durationMinutes ? `${session.durationMinutes}-minute` : "";
  const blocks: ReportBlock[] = [
    {
      type: "paragraph",
      text: `${CHILD} had a ${duration ? duration + " " : ""}${formatSetting(session.setting)} session on ${session.date}.`.replace(
        "  ",
        " "
      ),
    },
  ];
  if (session.therapistNotes && session.therapistNotes.trim()) {
    blocks.push({ type: "quote", label: "In the therapist's words", text: session.therapistNotes.trim() });
  }
  return { key: "greeting", heading: "This session", blocks };
}

function buildHighlights(input: GenerationInput): ReportSection {
  const items = [...input.goals.map(goalHighlight), ...input.skills.map(skillHighlight)].filter(
    (item): item is string => item !== null
  );
  if (items.length === 0) {
    return {
      key: "highlights",
      heading: "Progress highlights",
      blocks: [{ type: "paragraph", text: "No specific goals or skills were tracked in this session." }],
    };
  }
  return { key: "highlights", heading: "Progress highlights", blocks: [{ type: "bullets", items }] };
}

function buildFocusAreas(input: GenerationInput): ReportSection {
  const items = input.behaviours.map(behaviourFocusNote).filter((item): item is string => item !== null);
  if (items.length === 0) {
    return {
      key: "focus_areas",
      heading: "What we're focusing on",
      blocks: [{ type: "paragraph", text: "Nothing specific to flag from this session." }],
    };
  }
  return { key: "focus_areas", heading: "What we're focusing on", blocks: [{ type: "bullets", items }] };
}

const PRACTICE_TIP_VARIANTS: ((name: string) => string)[] = [
  (name) => `Try creating small, relaxed chances to practise ${name} together this week -- it's what stood out most this session.`,
  (name) => `${CHILD} is making real headway on ${name}. A few minutes of low-pressure practice at home goes a long way here.`,
  (name) => `Keep the momentum going on ${name}. Everyday moments like mealtime or playtime are great chances to reinforce it.`,
];

const MASTERY_TIP_VARIANTS: ((name: string) => string)[] = [
  (name) => `${CHILD} is close to mastering "${name}." Keep celebrating wins on this one at home.`,
  (name) => `"${name}" is nearly there. Noticing and praising it when it happens at home reinforces the win.`,
];

const CONSISTENCY_TIP_VARIANTS: ((name: string) => string)[] = [
  (name) => `${name.charAt(0).toUpperCase()}${name.slice(1)} came up a bit more than usual this session. Keeping your response consistent with what we're doing in session helps the most here.`,
  (name) => `We're keeping a close eye on ${name} right now. Sticking to the same calm, consistent response at home really helps.`,
];

function buildNextSteps(input: GenerationInput): ReportSection {
  const items: string[] = [];
  const seen = new Set<string>();
  const add = (text: string) => {
    if (seen.has(text)) return;
    seen.add(text);
    items.push(text);
  };

  const movers = [
    ...input.goals
      .filter((g) => g.percentComplete !== null && g.previousPercentComplete !== null)
      .map((g) => ({
        id: g.id,
        name: g.title.toLowerCase(),
        delta: (g.percentComplete as number) - (g.previousPercentComplete as number),
        current: g.percentComplete as number,
      })),
    ...input.skills
      .filter((s) => s.percentThisSession !== null && s.previousPercent !== null)
      .map((s) => ({
        id: s.id,
        name: s.label.toLowerCase(),
        delta: (s.percentThisSession as number) - (s.previousPercent as number),
        current: s.percentThisSession as number,
      })),
  ];
  const biggestGain = movers.filter((m) => m.delta > 0 && m.current < 80).sort((a, b) => b.delta - a.delta)[0];
  if (biggestGain) add(pickVariant(PRACTICE_TIP_VARIANTS, biggestGain.id)(biggestGain.name));

  for (const goal of input.goals) {
    if (goal.percentComplete !== null && goal.percentComplete >= 80) {
      add(pickVariant(MASTERY_TIP_VARIANTS, goal.id)(goal.title));
    }
  }
  for (const skill of input.skills) {
    if (skill.percentThisSession !== null && skill.percentThisSession >= 80) {
      add(pickVariant(MASTERY_TIP_VARIANTS, skill.id)(skill.label));
    }
  }
  for (const b of input.behaviours) {
    if (b.perHour === null || b.previousPerHour === null) continue;
    const worsening = b.direction === "decrease" ? b.perHour > b.previousPerHour : b.perHour < b.previousPerHour;
    if (worsening) add(pickVariant(CONSISTENCY_TIP_VARIANTS, b.id)(behaviourParentName(b)));
  }

  if (items.length === 0) {
    const touched = [
      ...input.goals.filter((g) => g.percentComplete !== null).map((g) => g.title.toLowerCase()),
      ...input.skills.filter((s) => s.percentThisSession !== null).map((s) => s.label.toLowerCase()),
    ];
    if (touched.length > 0) {
      add(
        `This session focused on ${touched.join(" and ")}. Keep creating chances to practise these same things at home -- little and often helps most.`
      );
    } else {
      add("Keep up the consistent routines you're already using at home. Small, steady practice makes the biggest difference.");
    }
  }

  return { key: "next_steps", heading: "How you can help at home", blocks: [{ type: "bullets", items }] };
}

/** Same computed inputs as the therapist report, translated into a warm, plain-language, non-clinical voice. No raw counts, percentages, or antecedent/consequence detail. */
export function generateParentReport(input: GenerationInput): ReportBody {
  return {
    schemaVersion: 1,
    sections: [buildGreeting(input), buildHighlights(input), buildFocusAreas(input), buildNextSteps(input)],
  };
}

/** Pure, deterministic report generation -- no AI involved. Every value cited is one the caller already computed. */
export function generateTherapistReport(input: GenerationInput): ReportBody {
  return {
    schemaVersion: 1,
    sections: [
      buildSessionSummary(input),
      buildClinicalObservations(input),
      buildDataSummary(input),
      buildClinicalInterpretation(input),
      buildRecommendations(input),
    ],
  };
}

/** Substitutes the real child name at render time, keeping the stored body stable across name edits. */
export function renderReportBody(body: ReportBody, childFirstName: string): ReportBody {
  const replace = (text: string) => text.split(CHILD).join(childFirstName);
  return {
    ...body,
    sections: body.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => ({
        ...block,
        text: block.text ? replace(block.text) : block.text,
        items: block.items?.map(replace),
        rows: block.rows?.map((row) => row.map(replace)),
      })),
    })),
  };
}

/** A short quotable line for a compact preview (e.g. the parent dashboard card) -- the first progress highlight, or the session greeting if there's nothing to highlight. Call after renderReportBody so {{CHILD}} is already substituted. */
export function extractReportSnippet(body: ReportBody): string | null {
  const highlights = body.sections.find((s) => s.key === "highlights");
  const highlightItems = highlights?.blocks.find((b) => b.type === "bullets")?.items;
  if (highlightItems?.[0]) return highlightItems[0];

  const greeting = body.sections.find((s) => s.key === "greeting");
  const greetingText = greeting?.blocks.find((b) => b.type === "paragraph")?.text;
  if (greetingText) return greetingText;

  return null;
}
