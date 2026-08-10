import type {
  GenerationAbcObservation,
  GenerationBehaviourInput,
  GenerationGoalInput,
  GenerationInput,
  GenerationSkillInput,
  ReportBlock,
  ReportBody,
  ReportSection,
} from "./types";
import { applyParentFriendlyLanguage } from "./safety";

// ---------------------------------------------------------------------------
// domain-typed skill helpers -- shared between the clinical and parent
// interpretations of a domain-typed skill entry.
// ---------------------------------------------------------------------------

interface NameResponseData {
  orientationPercent: number | null;
  approachPercent: number | null;
}
interface FunctionalCommunicationData {
  requestsObserved: string[];
}
interface FunctionalIndependenceData {
  activity: string | null;
  communicationUsed: string[];
  independenceLevel: string | null;
}
interface SpeechApproximationData {
  wordOrSound: string | null;
  approximation: string | null;
}
interface CommunicativeInitiationData {
  gazePercent: number | null;
  vocalizationPercent: number | null;
  gesturePercent: number | null;
}
interface ReceptiveInstructionsData {
  instruction: string | null;
  accuracyPercent: number | null;
}
interface ObjectIdentificationData {
  itemsCorrectlyIdentified: string | null;
  accuracyPercent: number | null;
}
interface ConceptUnderstandingData {
  concept: string | null;
  accuracyPercent: number | null;
}
interface TactingNamingData {
  itemsLabelled: string[];
  accuracyPercent: number | null;
}
interface MandDiversityData {
  newRequestWords: string[];
}
interface MotorSpeechDttcData {
  soundsWordsPractised: string[];
  performance: string | null;
}

/** Threshold bands shared by every domain's parent-facing percent-based sentence -- same bands proven for Name Response, never a per-domain invented scale. */
function percentBand(percent: number, high: string, mid: string, low: string): string {
  if (percent >= 70) return high;
  if (percent >= 40) return mid;
  return low;
}

/** Strips trailing periods (and trailing whitespace) off free text before a template appends its own -- otherwise a therapist ending their own sentence with "." produces a visible ".." wherever that text is quoted mid-sentence. */
function stripTrailingPeriod(text: string): string {
  return text.trim().replace(/\.+$/, "");
}

const ACTIVITY_LABEL: Record<string, string> = {
  toileting: "Toileting",
  feeding: "Feeding",
  dressing: "Dressing",
  hand_washing: "Hand washing",
  personal_hygiene: "Personal hygiene",
  transitioning: "Transitioning",
  other: "Daily living",
};

const MODALITY_LABEL: Record<string, string> = {
  vocalization: "vocalization",
  gesture: "gesture",
  sign: "sign",
  aac: "AAC",
  eye_gaze: "eye gaze",
  other: "another modality",
};

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const CHILD = "{{CHILD}}";

function formatSetting(setting: string | null): string {
  if (setting === "in_person") return "in-person";
  if (setting === "virtual") return "virtual";
  return "unspecified-setting";
}

// ---------------------------------------------------------------------------
// session_summary
// ---------------------------------------------------------------------------

const ATTENDANCE_LABEL: Record<string, string> = {
  late: "Attendance: arrived late.",
  partial: "Attendance: partial attendance.",
};

function buildSessionSummary(input: GenerationInput): ReportSection {
  const { session } = input;
  const duration = session.durationMinutes ? `${session.durationMinutes}-minute` : "";
  const therapistPhrase = session.therapistName ? ` with ${session.therapistName}` : "";
  const blocks: ReportBlock[] = [
    {
      type: "paragraph",
      text: `${CHILD} attended a ${duration ? duration + " " : ""}${formatSetting(session.setting)} session${therapistPhrase} on ${session.date}.`.replace(
        "  ",
        " "
      ),
    },
  ];

  if (session.location && session.location.trim()) {
    blocks.push({ type: "paragraph", text: `Location: ${stripTrailingPeriod(session.location)}.` });
  }
  if (session.attendance && ATTENDANCE_LABEL[session.attendance]) {
    blocks.push({ type: "paragraph", text: ATTENDANCE_LABEL[session.attendance] });
  }
  if (session.generalPresentation && session.generalPresentation.trim()) {
    blocks.push({ type: "paragraph", text: `General presentation: ${stripTrailingPeriod(session.generalPresentation)}.` });
  }

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
  if (b.antecedent) sentence += ` Antecedent: ${stripTrailingPeriod(b.antecedent)}.`;
  if (b.consequence) sentence += ` Consequence: ${stripTrailingPeriod(b.consequence)}.`;
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
// abc_observations
// ---------------------------------------------------------------------------

// Same vocabulary as the ABC builder's dropdown (src/components/therapy-session/abc-observation-builder.tsx) -- keeping these in sync is what makes exact pattern grouping possible below.
const ANTECEDENT_CATEGORY_LABEL: Record<string, string> = {
  transition: "transition between activities",
  denied: "denied access / told no",
  non_preferred: "non-preferred task demand",
  attention: "attention removed or withdrawn",
  peer: "peer interaction",
  wait: "being asked to wait",
  other: "an unclear or other trigger",
};

function abcObservationParagraph(o: GenerationAbcObservation): string {
  const parts = [`Behaviour: ${stripTrailingPeriod(o.behaviourLabel)}.`];
  const categoryLabel = o.antecedentCategory ? ANTECEDENT_CATEGORY_LABEL[o.antecedentCategory] : null;
  if (categoryLabel) {
    const detail = o.antecedent ? ` (${stripTrailingPeriod(o.antecedent)})` : "";
    parts.push(`Antecedent: ${categoryLabel}${detail}.`);
  } else if (o.antecedent) {
    parts.push(`Antecedent: ${stripTrailingPeriod(o.antecedent)}.`);
  }
  if (o.behaviourObserved) parts.push(`Behaviour observed: ${stripTrailingPeriod(o.behaviourObserved)}.`);
  if (o.consequence) parts.push(`Consequence: ${stripTrailingPeriod(o.consequence)}.`);
  if (o.outcome) parts.push(`Outcome: ${stripTrailingPeriod(o.outcome)}.`);
  return parts.join(" ");
}

// Fallback for entries with no antecedent_category set (older data, or a
// therapist who skipped the dropdown) -- simple substring keywords, not
// exact grouping, so it only catches repeated *wording*, not full
// paraphrases with zero literal overlap. Once a category is picked, the
// exact GROUP BY below is used instead and this never runs for that entry.
const ANTECEDENT_PATTERN_KEYWORDS = ["transition", "denied", "non-preferred", "attention", "peer", "wait"];

/** Groups this session's ABC observations by behaviour, then flags antecedent triggers shared by 2+ instances of the same behaviour -- exact match on antecedent_category where it's set (paraphrase-proof), keyword-substring fallback on the free-text antecedent where it isn't. Only fires within a single session's repeatable ABC rows -- session_behaviour_entries carries at most one antecedent per behaviour per session, so it can't represent "multiple instances, each with their own antecedent" the way the ABC builder can. */
function buildAntecedentPatterns(observations: GenerationAbcObservation[]): string[] {
  const byBehaviour = new Map<string, GenerationAbcObservation[]>();
  for (const o of observations) {
    if (!o.antecedent && !o.antecedentCategory) continue;
    const key = o.behaviourLabel.toLowerCase();
    byBehaviour.set(key, [...(byBehaviour.get(key) ?? []), o]);
  }

  const patterns: string[] = [];
  for (const entries of byBehaviour.values()) {
    if (entries.length < 2) continue;
    const behaviourLabel = entries[0].behaviourLabel;

    const categorized = entries.filter((e) => e.antecedentCategory);
    const byCategory = new Map<string, GenerationAbcObservation[]>();
    for (const e of categorized) {
      byCategory.set(e.antecedentCategory!, [...(byCategory.get(e.antecedentCategory!) ?? []), e]);
    }
    let matchedCategory = false;
    for (const [category, matches] of byCategory) {
      if (matches.length >= 2) {
        const label = ANTECEDENT_CATEGORY_LABEL[category] ?? category;
        patterns.push(
          `A pattern was noted: ${matches.length} of ${entries.length} "${behaviourLabel}" instances this session were associated with ${label}. Continued use of proactive strategies for these situations is recommended.`
        );
        matchedCategory = true;
      }
    }
    if (matchedCategory) continue;

    const uncategorized = entries.filter((e) => !e.antecedentCategory && e.antecedent);
    if (uncategorized.length < 2) continue;
    for (const keyword of ANTECEDENT_PATTERN_KEYWORDS) {
      const matches = uncategorized.filter((e) => e.antecedent!.toLowerCase().includes(keyword));
      if (matches.length >= 2) {
        patterns.push(
          `A pattern was noted: ${matches.length} of ${entries.length} "${behaviourLabel}" instances this session were associated with ${keyword}-related antecedents. Continued use of proactive strategies for these situations is recommended.`
        );
        break; // one pattern sentence per behaviour group is enough signal
      }
    }
  }
  return patterns;
}

function buildAbcObservations(input: GenerationInput): ReportSection | null {
  if (input.abcObservations.length === 0) return null;
  const blocks: ReportBlock[] = input.abcObservations.map((o) => ({
    type: "paragraph",
    text: abcObservationParagraph(o),
  }));
  for (const pattern of buildAntecedentPatterns(input.abcObservations)) {
    blocks.push({ type: "paragraph", label: "Pattern noted", text: pattern });
  }
  return {
    key: "abc_observations",
    heading: "Behavioural observations (ABC)",
    blocks,
  };
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

const EMERGING_THRESHOLD = 60;

function goalInterpretation(goal: GenerationGoalInput): string | null {
  if (goal.percentComplete === null) return null;
  const delta = goal.previousPercentComplete === null ? null : goal.percentComplete - goal.previousPercentComplete;
  const emerging = goal.percentComplete < EMERGING_THRESHOLD;

  if (delta === null) {
    return emerging
      ? `${goal.title}: this goal is currently emerging, at ${goal.percentComplete}% complete. No trend is available yet -- will continue to be targeted.`
      : `${goal.title}: first recorded data point at ${goal.percentComplete}% complete. No trend is available yet.`;
  }
  if (delta >= 15) {
    return `${goal.title}: ${CHILD} showed meaningful progress this session, up ${delta} points to ${goal.percentComplete}% complete.`;
  }
  if (delta >= 5) {
    return `${goal.title}: steady progress, up ${delta} points to ${goal.percentComplete}% complete.`;
  }
  if (delta > -5) {
    return emerging
      ? `${goal.title}: this goal is still emerging, holding at ${goal.percentComplete}% complete. Continued targeting is recommended.`
      : `${goal.title}: holding at ${goal.percentComplete}% complete, no meaningful change since the last session.`;
  }
  return `${goal.title}: down ${Math.abs(delta)} points to ${goal.percentComplete}% complete since the last session. Worth reviewing what changed.`;
}

/** Clinical-register sentence for a domain-typed skill, reading only its recorded structured_data -- no comparison/trend claim, since prior structured_data isn't tracked. Returns null if this domain's fields weren't recorded this session, so it never invents a data point. */
function domainSkillInterpretation(skill: GenerationSkillInput): string | null {
  const notesSuffix = skill.notes ? ` Notes: ${stripTrailingPeriod(skill.notes)}.` : "";

  if (skill.domainType === "name_response") {
    const d = skill.structuredData as unknown as NameResponseData | null;
    if (!d || (d.orientationPercent === null && d.approachPercent === null)) return null;
    const parts: string[] = [];
    if (d.orientationPercent !== null) parts.push(`${d.orientationPercent}% orientation`);
    if (d.approachPercent !== null) parts.push(`${d.approachPercent}% approach`);
    return `${skill.label}: ${CHILD} demonstrated ${joinList(parts)} response${parts.length > 1 ? "s" : ""} following name presentation.${notesSuffix}`;
  }

  if (skill.domainType === "functional_communication") {
    const d = skill.structuredData as unknown as FunctionalCommunicationData | null;
    const requests = d?.requestsObserved?.filter(Boolean) ?? [];
    if (requests.length === 0) return null;
    const promptPhrase = skill.promptLevel ? `, ${skill.promptLevel.replace("_", " ")}` : "";
    return `${skill.label}: ${CHILD} used functional communication to request ${joinList(requests)}${promptPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "speech_approximation") {
    const d = skill.structuredData as unknown as SpeechApproximationData | null;
    if (!d?.wordOrSound && !d?.approximation) return null;
    const promptPhrase = skill.promptLevel ? `, ${skill.promptLevel.replace("_", " ")}` : "";
    return `${skill.label}: ${CHILD} attempted "${d?.wordOrSound ?? "target"}" with an approximation of "${d?.approximation ?? "recorded"}"${promptPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "communicative_initiation") {
    const d = skill.structuredData as unknown as CommunicativeInitiationData | null;
    const parts: string[] = [];
    if (d?.gazePercent !== null && d?.gazePercent !== undefined) parts.push(`gaze (${d.gazePercent}%)`);
    if (d?.vocalizationPercent !== null && d?.vocalizationPercent !== undefined) parts.push(`vocalization (${d.vocalizationPercent}%)`);
    if (d?.gesturePercent !== null && d?.gesturePercent !== undefined) parts.push(`gesture (${d.gesturePercent}%)`);
    if (parts.length === 0) return null;
    return `${skill.label}: ${CHILD} initiated communication via ${joinList(parts)}.${notesSuffix}`;
  }

  if (skill.domainType === "receptive_instructions") {
    const d = skill.structuredData as unknown as ReceptiveInstructionsData | null;
    if (!d || (!d.instruction && d.accuracyPercent === null)) return null;
    const promptPhrase = skill.promptLevel ? `, ${skill.promptLevel.replace("_", " ")}` : "";
    const accuracyPhrase = d?.accuracyPercent !== null && d?.accuracyPercent !== undefined ? `: ${d.accuracyPercent}% accuracy` : "";
    return `${d?.instruction ?? skill.label}${accuracyPhrase}${promptPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "object_identification") {
    const d = skill.structuredData as unknown as ObjectIdentificationData | null;
    if (!d || (!d.itemsCorrectlyIdentified && d.accuracyPercent === null)) return null;
    const accuracyPhrase = d?.accuracyPercent !== null && d?.accuracyPercent !== undefined ? ` (${d.accuracyPercent}% accuracy)` : "";
    return `${skill.label}: ${CHILD} correctly identified ${d?.itemsCorrectlyIdentified ?? "the target items"}${accuracyPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "concept_understanding") {
    const d = skill.structuredData as unknown as ConceptUnderstandingData | null;
    if (!d || (!d.concept && d.accuracyPercent === null)) return null;
    const accuracyPhrase = d?.accuracyPercent !== null && d?.accuracyPercent !== undefined ? `: ${d.accuracyPercent}% accuracy` : "";
    return `${d?.concept ?? skill.label}${accuracyPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "tacting_naming") {
    const d = skill.structuredData as unknown as TactingNamingData | null;
    const items = d?.itemsLabelled?.filter(Boolean) ?? [];
    if (!d || (items.length === 0 && d.accuracyPercent === null)) return null;
    const promptPhrase = skill.promptLevel ? `, ${skill.promptLevel.replace("_", " ")}` : "";
    const accuracyPhrase = d?.accuracyPercent !== null && d?.accuracyPercent !== undefined ? ` (${d.accuracyPercent}% accuracy)` : "";
    return `${skill.label}: ${CHILD} labelled ${items.length ? joinList(items) : "the target items"}${accuracyPhrase}${promptPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "mand_diversity") {
    const d = skill.structuredData as unknown as MandDiversityData | null;
    const words = d?.newRequestWords?.filter(Boolean) ?? [];
    if (words.length === 0) return null;
    const promptPhrase = skill.promptLevel ? `, ${skill.promptLevel.replace("_", " ")}` : "";
    return `${skill.label}: ${CHILD} used ${words.length} distinct request word${words.length === 1 ? "" : "s"} this session (${joinList(words)})${promptPhrase}.${notesSuffix}`;
  }

  if (skill.domainType === "motor_speech_dttc") {
    const d = skill.structuredData as unknown as MotorSpeechDttcData | null;
    const practised = d?.soundsWordsPractised?.filter(Boolean) ?? [];
    if (practised.length === 0 && !d?.performance) return null;
    const promptPhrase = skill.promptLevel ? `, ${skill.promptLevel.replace("_", " ")}` : "";
    const performancePhrase = d?.performance ? ` Performance: ${stripTrailingPeriod(d.performance)}.` : "";
    return `${skill.label}: practised ${practised.length ? joinList(practised) : "target sounds/words"}${promptPhrase}.${performancePhrase}${notesSuffix}`;
  }

  if (skill.domainType === "functional_independence") {
    const d = skill.structuredData as unknown as FunctionalIndependenceData | null;
    if (!d?.activity) return null;
    const activityLabel = ACTIVITY_LABEL[d.activity] ?? d.activity;
    const modalityPhrase = d.communicationUsed?.length
      ? ` Communication used: ${joinList(d.communicationUsed.map((m) => MODALITY_LABEL[m] ?? m))}.`
      : "";
    const independencePhrase = d.independenceLevel
      ? ` Level of independence: ${d.independenceLevel.replace("_", " ")}.`
      : "";
    return `${activityLabel}: ${skill.label}.${modalityPhrase}${independencePhrase}${notesSuffix}`;
  }

  return null;
}

function skillInterpretation(skill: GenerationSkillInput): string | null {
  if (skill.domainType) return domainSkillInterpretation(skill);
  if (skill.percentThisSession === null) return null;
  const delta = skill.previousPercent === null ? null : skill.percentThisSession - skill.previousPercent;
  const masteryNote = skill.percentThisSession >= 90 ? " -- consistently demonstrating this skill." : skill.percentThisSession >= 80 ? " -- trending toward the mastery criterion." : "";
  const emerging = skill.percentThisSession < EMERGING_THRESHOLD;

  if (delta === null) {
    return emerging
      ? `${skill.label}: this skill is currently emerging, at ${skill.percentThisSession}% independent. Will continue to be targeted.`
      : `${skill.label}: first recorded data point at ${skill.percentThisSession}% independent.${masteryNote}`;
  }
  if (delta >= 10) {
    return `${skill.label}: clear improvement, up ${delta} points to ${skill.percentThisSession}% independent.${masteryNote}`;
  }
  if (delta > -10) {
    return emerging
      ? `${skill.label}: this skill is still emerging, holding at ${skill.percentThisSession}% independent. Continued targeting is recommended.`
      : `${skill.label}: stable at ${skill.percentThisSession}% independent.${masteryNote}`;
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
// small set of warm, plain-language phrases.
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
  const emerging = goal.percentComplete < EMERGING_THRESHOLD;

  if (delta === null) {
    return emerging
      ? pickVariant(
          [
            `This is an early step for ${name} -- we'll keep building on it together.`,
            `We're just getting started on ${name}. It's early days, and that's exactly where we'd expect to be.`,
          ],
          goal.id
        )
      : pickVariant(
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
    return emerging
      ? pickVariant(
          [
            `${name.charAt(0).toUpperCase()}${name.slice(1)} is still an early goal for ${CHILD} -- we're continuing to build toward it step by step.`,
            `We're staying consistent with ${name}. This is still early progress, and that's expected at this stage.`,
          ],
          goal.id
        )
      : pickVariant(
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
  const emerging = skill.percentThisSession < EMERGING_THRESHOLD;

  if (delta === null) {
    return emerging
      ? pickVariant(
          [
            `This is an early stage for ${name} -- we'll keep practising and building on it.`,
            `We're just introducing ${name}. It's early days, which is exactly where we'd expect to be.`,
          ],
          skill.id
        )
      : pickVariant(
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
    return emerging
      ? pickVariant(
          [
            `${name.charAt(0).toUpperCase()}${name.slice(1)} is still an early skill for ${CHILD} -- we're continuing to build on it with consistent practice.`,
            `We're staying consistent with ${name}. This is still early progress, and that's expected at this stage.`,
          ],
          skill.id
        )
      : pickVariant(
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

const ATTENDANCE_PARENT_PHRASE: Record<string, string> = {
  late: `${CHILD} joined a little later than usual today.`,
  partial: `${CHILD} was able to join for part of today's session.`,
};

function buildGreeting(input: GenerationInput): ReportSection {
  const { session } = input;
  const duration = session.durationMinutes ? `${session.durationMinutes}-minute` : "";
  const therapistPhrase = session.therapistName ? ` with ${session.therapistName}` : "";
  const blocks: ReportBlock[] = [
    {
      type: "paragraph",
      text: `${CHILD} had a ${duration ? duration + " " : ""}${formatSetting(session.setting)} session${therapistPhrase} on ${session.date}.`.replace(
        "  ",
        " "
      ),
    },
  ];
  if (session.location && session.location.trim()) {
    blocks.push({ type: "paragraph", text: `Location: ${stripTrailingPeriod(session.location)}.` });
  }
  if (session.attendance && ATTENDANCE_PARENT_PHRASE[session.attendance]) {
    blocks.push({ type: "paragraph", text: ATTENDANCE_PARENT_PHRASE[session.attendance] });
  }
  if (session.generalPresentation && session.generalPresentation.trim()) {
    blocks.push({
      type: "paragraph",
      text: applyParentFriendlyLanguage(session.generalPresentation.trim(), input.behaviours),
    });
  }
  if (session.therapistNotes && session.therapistNotes.trim()) {
    const parentFriendly = applyParentFriendlyLanguage(session.therapistNotes.trim(), input.behaviours);
    blocks.push({ type: "quote", label: "In the therapist's words", text: parentFriendly });
  }
  return { key: "greeting", heading: "This session", blocks };
}

/** Plain-language, non-clinical translation of a domain-typed skill for a parent -- same "never claim what the data doesn't support" discipline as the clinical side, just warmer wording and no raw percentages. */
/**
 * Every raw structured_data free-text value quoted here MUST go through
 * applyParentFriendlyLanguage first -- these are plain <Input> text boxes a
 * therapist can type anything into (unlike name_response/
 * communicative_initiation/functional_independence, which only ever surface
 * percentages or fixed enum labels). This is the same filter buildGreeting
 * already applies to therapistNotes/generalPresentation; skipping it here
 * was the exact gap the security sweep found.
 */
function domainSkillParentSentence(
  skill: GenerationSkillInput,
  behaviours: GenerationBehaviourInput[]
): string | null {
  const clean = (text: string) => applyParentFriendlyLanguage(text, behaviours);
  const cleanList = (items: string[]) => items.map(clean);

  if (skill.domainType === "name_response") {
    const d = skill.structuredData as unknown as NameResponseData | null;
    const best = Math.max(d?.orientationPercent ?? -1, d?.approachPercent ?? -1);
    if (best < 0) return null;
    if (best >= 70) {
      return `${CHILD} responded well to ${CHILD}'s name today, looking and moving toward the therapist during most opportunities.`;
    }
    if (best >= 40) {
      return `${CHILD} responded to ${CHILD}'s name several times today. We're continuing to build on this.`;
    }
    return `We're still working on ${CHILD}'s response to ${CHILD}'s name -- this is an early stage for this skill, and that's completely normal.`;
  }

  if (skill.domainType === "functional_communication") {
    const d = skill.structuredData as unknown as FunctionalCommunicationData | null;
    const requests = d?.requestsObserved?.filter(Boolean) ?? [];
    if (requests.length === 0) return null;
    const promptPhrase = skill.promptLevel === "independent" ? "independently " : "";
    return `${CHILD} did well using sounds, words, and gestures to communicate what ${CHILD} wanted. ${CHILD} ${promptPhrase}requested ${joinList(cleanList(requests))} during the session.`;
  }

  if (skill.domainType === "speech_approximation") {
    const d = skill.structuredData as unknown as SpeechApproximationData | null;
    if (!d?.wordOrSound) return null;
    const approximationPhrase = d.approximation ? `, and said something close to "${clean(d.approximation)}"` : "";
    return `${CHILD} practised saying "${clean(d.wordOrSound)}" today${approximationPhrase}. Every attempt like this builds toward clearer speech.`;
  }

  if (skill.domainType === "communicative_initiation") {
    const d = skill.structuredData as unknown as CommunicativeInitiationData | null;
    const modalities: string[] = [];
    if (d?.gazePercent) modalities.push("looking");
    if (d?.vocalizationPercent) modalities.push("sounds");
    if (d?.gesturePercent) modalities.push("gestures");
    if (modalities.length === 0) return null;
    return `${CHILD} reached out to start communication today using ${joinList(modalities)}.`;
  }

  if (skill.domainType === "receptive_instructions") {
    const d = skill.structuredData as unknown as ReceptiveInstructionsData | null;
    if (d?.accuracyPercent === null || d?.accuracyPercent === undefined) return null;
    const instructionPhrase = d.instruction ? `, including "${clean(d.instruction)}"` : "";
    return percentBand(
      d.accuracyPercent,
      `${CHILD} followed instructions very well today${instructionPhrase}.`,
      `${CHILD} followed instructions several times today${instructionPhrase}. We're continuing to build on this.`,
      `We're still working on ${CHILD} following instructions consistently -- this is an early stage, and that's completely normal.`
    );
  }

  if (skill.domainType === "object_identification") {
    const d = skill.structuredData as unknown as ObjectIdentificationData | null;
    if (!d?.itemsCorrectlyIdentified) return null;
    return `${CHILD} did well identifying ${clean(d.itemsCorrectlyIdentified)} today.`;
  }

  if (skill.domainType === "concept_understanding") {
    const d = skill.structuredData as unknown as ConceptUnderstandingData | null;
    if (d?.accuracyPercent === null || d?.accuracyPercent === undefined) return null;
    const conceptName = d.concept ? clean(d.concept) : "this concept";
    return percentBand(
      d.accuracyPercent,
      `${CHILD} showed a strong understanding of ${conceptName} today.`,
      `${CHILD} is building an understanding of ${conceptName}, with several correct responses today.`,
      `We're just starting to introduce ${conceptName} -- this is an early stage for it.`
    );
  }

  if (skill.domainType === "tacting_naming") {
    const d = skill.structuredData as unknown as TactingNamingData | null;
    const items = d?.itemsLabelled?.filter(Boolean) ?? [];
    if (items.length === 0) return null;
    return `${CHILD} did well naming ${joinList(cleanList(items))} today.`;
  }

  if (skill.domainType === "mand_diversity") {
    const d = skill.structuredData as unknown as MandDiversityData | null;
    const words = d?.newRequestWords?.filter(Boolean) ?? [];
    if (words.length === 0) return null;
    return `${CHILD} used several different words to ask for things today, including ${joinList(cleanList(words))}.`;
  }

  if (skill.domainType === "motor_speech_dttc") {
    const d = skill.structuredData as unknown as MotorSpeechDttcData | null;
    const practised = d?.soundsWordsPractised?.filter(Boolean) ?? [];
    if (practised.length === 0) return null;
    return `${CHILD} practised saying ${joinList(cleanList(practised))} today.`;
  }

  if (skill.domainType === "functional_independence") {
    const d = skill.structuredData as unknown as FunctionalIndependenceData | null;
    if (!d?.activity) return null;
    const modalityPhrase = d.communicationUsed?.length
      ? ` ${CHILD} communicated this using ${joinList(d.communicationUsed.map((m) => MODALITY_LABEL[m] ?? m))}.`
      : "";
    const independencePhrase =
      d.independenceLevel === "independent"
        ? ` This was a great example of ${CHILD}'s developing ability to do this independently.`
        : d.independenceLevel
          ? ` ${CHILD} needed some support with this today, which is a normal part of learning.`
          : "";
    return `One of the highlights of today's session was ${CHILD}'s progress with ${(ACTIVITY_LABEL[d.activity] ?? d.activity).toLowerCase()}.${modalityPhrase}${independencePhrase}`;
  }

  return null;
}

/** Domain-headed parent sections: one named section per domain actually touched this session (goal domains, skill domain types -- functional-independence further split by activity, e.g. "Toileting" -- and behaviours), instead of the old cross-domain highlights/focus-areas split. Skills/goals with no domain type fall into "General progress" so nothing silently disappears. */
function buildDomainProgressSections(input: GenerationInput): ReportSection[] {
  const order: string[] = [];
  const buckets = new Map<string, { heading: string; sentences: string[] }>();

  function push(key: string, heading: string, sentence: string | null) {
    if (!sentence) return;
    if (!buckets.has(key)) {
      buckets.set(key, { heading, sentences: [] });
      order.push(key);
    }
    buckets.get(key)!.sentences.push(sentence);
  }

  for (const goal of input.goals) {
    const label = goalDomainLabel(goal.domain);
    push(`goal_${label}`, label, goalHighlight(goal));
  }

  for (const skill of input.skills) {
    if (skill.domainType === "name_response") {
      push("name_response", "Responding to Name", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "functional_communication") {
      push("functional_communication", "Communication", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "speech_approximation") {
      push("speech_practice", "Speech Practice", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "communicative_initiation") {
      push("communicative_initiation", "Initiating Communication", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "receptive_instructions") {
      push("receptive_instructions", "Following Instructions", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "object_identification") {
      push("object_identification", "Identifying Objects", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "concept_understanding") {
      push("concept_understanding", "Understanding Concepts", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "tacting_naming") {
      push("tacting_naming", "Naming Things", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "mand_diversity") {
      push("mand_diversity", "Asking for Things", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "motor_speech_dttc") {
      push("speech_practice", "Speech Practice", domainSkillParentSentence(skill, input.behaviours));
    } else if (skill.domainType === "functional_independence") {
      const structured = skill.structuredData as unknown as FunctionalIndependenceData | null;
      const activity = structured?.activity ?? "other";
      const heading = ACTIVITY_LABEL[activity] ?? "Daily living";
      push(`fi_${activity}`, heading, domainSkillParentSentence(skill, input.behaviours));
    } else {
      push("general_skill", "General progress", skillHighlight(skill));
    }
  }

  for (const behaviour of input.behaviours) {
    push("behaviour", "Behaviour", behaviourFocusNote(behaviour));
  }

  if (order.length === 0) {
    return [
      {
        key: "domain_progress",
        heading: "Progress",
        blocks: [{ type: "paragraph", text: "No specific goals or skills were tracked in this session." }],
      },
    ];
  }

  return order.map((key) => {
    const bucket = buckets.get(key)!;
    return {
      key: "domain_progress" as const,
      heading: bucket.heading,
      blocks: [{ type: "paragraph" as const, text: bucket.sentences.join(" ") }],
    };
  });
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
/**
 * Goal titles and skill labels are therapist-authored free text too (set
 * once at creation, not per-session) -- lower risk than session narrative
 * text, but the same built-in jargon dictionary applies to them before they
 * reach any parent-facing sentence, one transformation point instead of
 * threading the filter through every function that touches a title/label.
 * Clinical report intentionally does NOT use this -- it keeps the
 * therapist's own clinical terminology untouched.
 */
function toParentSafeInput(input: GenerationInput): GenerationInput {
  const clean = (text: string) => applyParentFriendlyLanguage(text, input.behaviours);
  return {
    ...input,
    goals: input.goals.map((g) => ({ ...g, title: clean(g.title) })),
    skills: input.skills.map((s) => ({ ...s, label: clean(s.label) })),
  };
}

export function generateParentReport(input: GenerationInput): ReportBody {
  const parentInput = toParentSafeInput(input);
  return {
    schemaVersion: 1,
    sections: [buildGreeting(parentInput), ...buildDomainProgressSections(parentInput), buildNextSteps(parentInput)],
  };
}

/** Pure, deterministic report generation -- no AI involved. Every value cited is one the caller already computed. */
export function generateTherapistReport(input: GenerationInput): ReportBody {
  const abcSection = buildAbcObservations(input);
  return {
    schemaVersion: 1,
    sections: [
      buildSessionSummary(input),
      buildClinicalObservations(input),
      ...(abcSection ? [abcSection] : []),
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
  const domainSection = body.sections.find((s) => s.key === "domain_progress");
  const domainText = domainSection?.blocks.find((b) => b.type === "paragraph")?.text;
  if (domainText) return domainText;

  const greeting = body.sections.find((s) => s.key === "greeting");
  const greetingText = greeting?.blocks.find((b) => b.type === "paragraph")?.text;
  if (greetingText) return greetingText;

  return null;
}
