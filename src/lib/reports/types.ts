export interface ReportProgressBar {
  label: string;
  /** 0-100, this session. */
  value: number;
  /** 0-100 last session, drawn as a tick behind the fill; null when there's no prior point. */
  previousValue: number | null;
}

export interface ReportTrendLine {
  label: string;
  /** One value per session in the window, oldest -> newest; null where nothing was recorded that session. */
  points: (number | null)[];
  unit: "percent" | "per_hour";
  /** Which direction of travel counts as progress -- drives the line colour and caption wording. */
  improvement: "up" | "down";
}

export interface ReportBlock {
  type: "paragraph" | "quote" | "bullets" | "data_table" | "progress_bars" | "trend_lines";
  /** Small uppercase eyebrow shown above the block, e.g. a clinical domain ("Communication"). */
  label?: string;
  text?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
  /** Parallel to rows: a group heading to insert above this row when it differs from the previous row's. */
  rowGroups?: string[];
  /** Parallel to rows: which way this row's change should read (colour/arrow), not just its sign. */
  rowTrends?: ("positive" | "negative" | "neutral")[];
  /** progress_bars: one horizontal 0-100 bar per goal/skill worked on this session. */
  bars?: ReportProgressBar[];
  /** trend_lines: one sparkline per goal/skill/behaviour with enough history to plot. */
  lines?: ReportTrendLine[];
  /** trend_lines: ISO date for each point index, shared by every line. */
  pointDates?: string[];
}

export type ReportSectionKey =
  | "session_summary"
  | "clinical_observations"
  | "abc_observations"
  | "data_summary"
  | "clinical_interpretation"
  | "recommendations"
  | "greeting"
  | "domain_progress"
  | "todays_wins"
  | "progress_snapshot"
  | "next_steps";

export interface ReportSection {
  key: ReportSectionKey;
  heading: string;
  blocks: ReportBlock[];
}

export interface ReportBody {
  schemaVersion: 1;
  sections: ReportSection[];
}

export interface GenerationGoalInput {
  id: string;
  title: string;
  domain: string | null;
  percentComplete: number | null;
  previousPercentComplete: number | null;
  note: string | null;
}

export interface GenerationBehaviourInput {
  id: string;
  label: string;
  parentLabel: string | null;
  measurement: string;
  direction: "increase" | "decrease";
  rawValue: number | null;
  previousRawValue: number | null;
  perHour: number | null;
  previousPerHour: number | null;
  antecedent: string | null;
  consequence: string | null;
}

export type SkillDomainType =
  | "name_response"
  | "functional_communication"
  | "functional_independence"
  | "speech_approximation"
  | "communicative_initiation"
  | "receptive_instructions"
  | "object_identification"
  | "concept_understanding"
  | "tacting_naming"
  | "mand_diversity"
  | "motor_speech_dttc";

export interface GenerationSkillInput {
  id: string;
  label: string;
  masteryCriteria: string | null;
  percentThisSession: number | null;
  previousPercent: number | null;
  promptLevel: string | null;
  domainType: SkillDomainType | null;
  structuredData: Record<string, unknown> | null;
  notes: string | null;
}

export interface GenerationAbcObservation {
  behaviourLabel: string;
  antecedent: string | null;
  antecedentCategory: string | null;
  behaviourObserved: string | null;
  consequence: string | null;
  outcome: string | null;
}

export interface GenerationInput {
  session: {
    date: string;
    durationMinutes: number | null;
    setting: string | null;
    therapistNotes: string | null;
    /** The therapist's "what should we practice at home?" answer, split back
     *  out of therapistNotes -- drives the parent report's "How you can help
     *  at home" section. Null when the therapist left it blank. */
    homePractice: string | null;
    attendance: string | null;
    generalPresentation: string | null;
    therapistName: string | null;
    location: string | null;
  };
  goals: GenerationGoalInput[];
  behaviours: GenerationBehaviourInput[];
  skills: GenerationSkillInput[];
  reinforcers: { label: string; effectiveness: number | null }[];
  abcObservations: GenerationAbcObservation[];
  /** The recent-session window used to draw progress bars and trend
   *  sparklines. Oldest -> newest, including the session being reported on,
   *  capped to the most recent few sessions. */
  history: GenerationHistoryInput;
}

export interface GenerationHistorySeries {
  /** Matches an id in goals / skills / behaviours. */
  id: string;
  /** One value per date in `sessionDates`; null where nothing was recorded.
   *  Goals/skills are percentages; behaviours are per-hour rates. */
  values: (number | null)[];
}

export interface GenerationHistoryInput {
  sessionDates: string[];
  goals: GenerationHistorySeries[];
  skills: GenerationHistorySeries[];
  behaviours: GenerationHistorySeries[];
}
