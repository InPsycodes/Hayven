export type HomePracticeOutcome = "good" | "mixed" | "hard";
export type HomePracticeNextStep = "keep" | "change";

export interface HomePracticeTry {
  /** Lagos calendar day, YYYY-MM-DD. */
  loggedOn: string;
  outcome: HomePracticeOutcome;
  note: string | null;
}

export interface HomePracticeActivity {
  id: string;
  body: string;
  /** The day of the session that set it, YYYY-MM-DD. */
  setOn: string;
  therapistId: string;
  therapistName: string;
  nextStep: HomePracticeNextStep | null;
  /** Oldest first. */
  tries: HomePracticeTry[];
}

export const OUTCOME_LABEL: Record<HomePracticeOutcome, string> = {
  good: "Went well",
  mixed: "So-so",
  hard: "Hard",
};

/** Up to three activities per session, each one short line. */
export const MAX_ACTIVITIES = 3;
export const MAX_ACTIVITY_LENGTH = 500;
export const MAX_NOTE_LENGTH = 1000;
