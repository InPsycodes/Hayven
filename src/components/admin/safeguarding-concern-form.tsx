"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { updateSafeguardingConcern } from "@/lib/safeguarding/actions";
import {
  DECISION_LABELS,
  STATUS_LABELS,
  type SafeguardingConcernDecision,
  type SafeguardingConcernDetail,
  type SafeguardingConcernStatus,
} from "@/lib/safeguarding/types";

const selectClass =
  "h-10 rounded-md border border-input bg-card px-3 text-sm text-charcoal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function SafeguardingConcernForm({ concern }: { concern: SafeguardingConcernDetail }) {
  const [status, setStatus] = useState<SafeguardingConcernStatus>(concern.status);
  const [decision, setDecision] = useState<SafeguardingConcernDecision | "">(concern.decision ?? "");
  const [reasoning, setReasoning] = useState(concern.decisionReasoning ?? "");
  const [reviewDate, setReviewDate] = useState(concern.reviewDate ?? "");
  const [outcome, setOutcome] = useState(concern.outcome ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const submit = guard(() => {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateSafeguardingConcern(concern.id, {
        status,
        decision: decision || null,
        decisionReasoning: reasoning,
        reviewDate: reviewDate || null,
        outcome,
        note,
      });
      reset();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      setSaved(true);
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-decision">Decision</Label>
          <select
            id="sg-decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value as SafeguardingConcernDecision | "")}
            className={selectClass}
          >
            <option value="">Not decided yet</option>
            {(Object.keys(DECISION_LABELS) as SafeguardingConcernDecision[]).map((d) => (
              <option key={d} value={d}>
                {DECISION_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-status">Status</Label>
          <select
            id="sg-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SafeguardingConcernStatus)}
            className={selectClass}
          >
            {(Object.keys(STATUS_LABELS) as SafeguardingConcernStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {decision === "refer_externally" && (
        <p className="rounded-sm bg-inset p-3 text-xs text-charcoal">
          Lagos DSVRT: 0800 033 3333 (24/7, toll-free). Lagos State Child Protection Unit: 08023079008 /
          09077333426 / 08172437792. Outside Lagos, confirm that state&apos;s equivalent (procedure §5.2).
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="sg-reasoning">Reasoning for the decision</Label>
        <Textarea id="sg-reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sg-review">Review date</Label>
          <Input id="sg-review" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sg-outcome">Outcome</Label>
        <Textarea id="sg-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sg-note">Note for the history (optional)</Label>
        <Textarea
          id="sg-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Phoned the parent at 14:10, agreed a follow-up next week."
        />
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}
      {saved && <p className="fade-in text-sm text-success-text">Saved and added to the history.</p>}
      <Button onClick={submit} disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
