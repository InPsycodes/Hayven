export interface ReportBlock {
  type: "paragraph" | "quote" | "bullets" | "data_table";
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
}

export type ReportSectionKey =
  | "session_summary"
  | "clinical_observations"
  | "data_summary"
  | "clinical_interpretation"
  | "recommendations"
  | "greeting"
  | "highlights"
  | "focus_areas"
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

export interface GenerationSkillInput {
  id: string;
  label: string;
  masteryCriteria: string | null;
  percentThisSession: number | null;
  previousPercent: number | null;
  promptLevel: string | null;
}

export interface GenerationInput {
  session: {
    date: string;
    durationMinutes: number | null;
    setting: string | null;
    therapistNotes: string | null;
  };
  goals: GenerationGoalInput[];
  behaviours: GenerationBehaviourInput[];
  skills: GenerationSkillInput[];
  reinforcers: { label: string; effectiveness: number | null }[];
}
