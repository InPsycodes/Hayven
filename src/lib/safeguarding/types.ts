// Client-safe: shared by the admin and therapist components.

export type SafeguardingConcernStatus = "open" | "monitoring" | "referred" | "closed";
export type SafeguardingConcernDecision =
  | "monitor"
  | "contact_family"
  | "refer_externally"
  | "immediate_escalation"
  | "no_action";
export type SafeguardingConcernSource = "staff_report" | "auto_flag";

export const STATUS_LABELS: Record<SafeguardingConcernStatus, string> = {
  open: "Open",
  monitoring: "Monitoring",
  referred: "Referred externally",
  closed: "Closed",
};

// Procedure §5.2's four decisions, plus an explicit "no action needed" for
// an auto-flag that turns out to be benign (still recorded, with reasoning).
export const DECISION_LABELS: Record<SafeguardingConcernDecision, string> = {
  monitor: "Monitor",
  contact_family: "Contact the family",
  refer_externally: "Refer externally",
  immediate_escalation: "Immediate escalation (police 112)",
  no_action: "No action needed",
};

export interface SafeguardingConcernSummary {
  id: string;
  source: SafeguardingConcernSource;
  status: SafeguardingConcernStatus;
  immediateDanger: boolean;
  childFirstName: string | null;
  raisedByName: string | null;
  descriptionPreview: string;
  reviewDate: string | null;
  createdAt: string;
}

export interface SafeguardingConcernEvent {
  id: string;
  kind: string;
  note: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface SafeguardingConcernDetail extends Omit<SafeguardingConcernSummary, "descriptionPreview"> {
  childId: string | null;
  therapySessionId: string | null;
  description: string;
  matchedPhrases: string[];
  decision: SafeguardingConcernDecision | null;
  decisionReasoning: string | null;
  outcome: string | null;
  handledByName: string | null;
  closedAt: string | null;
  events: SafeguardingConcernEvent[];
}

/** What a raiser sees about their own concern -- procedure §5.4: told it was actioned, not the detail. */
export interface MyRaisedConcern {
  id: string;
  childFirstName: string | null;
  createdAt: string;
  actioned: boolean;
}

/** A review date that has passed on a concern that isn't closed yet. */
export function isReviewOverdue(reviewDate: string | null, status: SafeguardingConcernStatus): boolean {
  if (!reviewDate || status === "closed") return false;
  return reviewDate < new Date().toISOString().slice(0, 10);
}
