import { formatNaira } from "@/data/format";
import type { RefundOutcome } from "@/lib/booking/refund-policy";

export function refundNotificationBody(childName: string, when: string, outcome: RefundOutcome, byTherapist: boolean): string {
  const lead = byTherapist
    ? `${childName}'s session on ${when} was cancelled by the therapist.`
    : `${childName}'s session on ${when} is cancelled.`;
  if (outcome.refundNaira <= 0) {
    return `${lead} No refund applies for a cancellation this close to the session.`;
  }
  const feeNote =
    outcome.feeNaira > 0
      ? ` The payment processing fee (${formatNaira(outcome.feeNaira)}) is non-refundable.`
      : "";
  const tierNote =
    outcome.tier === "partial" ? " (50%, as it was within 24 hours of the start time)" : "";
  return `${lead} A refund of ${formatNaira(outcome.refundNaira)}${tierNote} will be sent to your card, usually within 5-10 business days.${feeNote}`;
}
