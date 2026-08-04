/**
 * Pure template/lookup generator for the parent-facing session summary --
 * NO AI involved. Each structured field maps to exactly one fixed phrase;
 * the output is a deterministic concatenation, so it's 100% predictable and
 * reviewable by the therapist before sending. Framework-agnostic (no React)
 * so it's independently testable and swappable.
 */

export type EngagementLevel = "low" | "medium" | "high";
export type CooperationLevel = "cooperative" | "prompted" | "resistant";
export type GoalStatus = "improved" | "steady" | "regressed";

export interface SessionReportFields {
  childName: string;
  engagement: EngagementLevel;
  cooperation: CooperationLevel;
  goals: { name: string; status: GoalStatus }[];
}

const ENGAGEMENT_PHRASES: Record<EngagementLevel, string> = {
  high: "was actively engaged throughout today's session",
  medium: "engaged with today's activities",
  low: "found some activities challenging today, and the therapist adjusted",
};

const COOPERATION_PHRASES: Record<CooperationLevel, string> = {
  cooperative: "was cooperative from start to finish",
  prompted: "cooperated well with some encouragement",
  resistant: "had a harder time cooperating today, which is normal some days",
};

const GOAL_STATUS_PHRASES: Record<GoalStatus, (goal: string) => string> = {
  improved: (goal) => `made great progress on ${goal}`,
  steady: (goal) => `held steady on ${goal}`,
  regressed: (goal) => `worked hard on ${goal}, though it was a tougher day for this one`,
};

export interface SummarySelection {
  field: string;
  phrase: string;
}

export function buildParentSummary(fields: SessionReportFields): {
  summary: string;
  selections: SummarySelection[];
} {
  const engagementPhrase = ENGAGEMENT_PHRASES[fields.engagement];
  const cooperationPhrase = COOPERATION_PHRASES[fields.cooperation];
  const goalPhrases = fields.goals.map((g) => GOAL_STATUS_PHRASES[g.status](g.name));

  const parts = [
    `${fields.childName} ${engagementPhrase}`,
    `and ${cooperationPhrase}.`,
    goalPhrases.length > 0 ? `${goalPhrases.join(", and ")}.` : "",
    "Keep reinforcing these at home with the exercise sheet.",
  ].filter(Boolean);

  const selections: SummarySelection[] = [
    { field: "Engagement", phrase: engagementPhrase },
    { field: "Cooperation", phrase: cooperationPhrase },
    ...fields.goals.map((g) => ({
      field: `Goal -- ${g.name}`,
      phrase: GOAL_STATUS_PHRASES[g.status](g.name),
    })),
  ];

  return { summary: parts.join(" "), selections };
}
