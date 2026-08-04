"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { submitSessionNote } from "@/data/mutations";
import { formatDateTime } from "@/data/format";
import {
  buildParentSummary,
  type CooperationLevel,
  type EngagementLevel,
  type GoalStatus,
} from "@/components/session-report/parent-summary-generator";

interface Goal {
  id: string;
  title: string;
}

const ENGAGEMENT_OPTIONS: { value: EngagementLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const COOPERATION_OPTIONS: { value: CooperationLevel; label: string }[] = [
  { value: "cooperative", label: "Cooperative throughout" },
  { value: "prompted", label: "Cooperative with prompting" },
  { value: "resistant", label: "Resistant" },
];

const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "improved", label: "Improved" },
  { value: "steady", label: "Steady" },
  { value: "regressed", label: "Regressed" },
];

export function SessionReportFlow({
  bookingId,
  therapistId,
  childName,
  parentName,
  sessionDateTime,
  goals,
}: {
  bookingId: string;
  therapistId: string;
  childName: string;
  parentName: string;
  sessionDateTime: string;
  goals: Goal[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(goals.map((g) => g.id));
  const [engagement, setEngagement] = useState<EngagementLevel>("high");
  const [cooperation, setCooperation] = useState<CooperationLevel>("cooperative");
  const [goalStatus, setGoalStatus] = useState<Record<string, GoalStatus>>(
    Object.fromEntries(goals.map((g) => [g.id, "improved" as GoalStatus]))
  );
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [editedSummary, setEditedSummary] = useState<string | null>(null);

  const generated = useMemo(
    () =>
      buildParentSummary({
        childName,
        engagement,
        cooperation,
        goals: selectedGoalIds.map((id) => ({
          name: goals.find((g) => g.id === id)?.title ?? "this goal",
          status: goalStatus[id] ?? "steady",
        })),
      }),
    [childName, engagement, cooperation, selectedGoalIds, goalStatus, goals]
  );

  const finalSummary = editedSummary ?? generated.summary;

  function toggleGoal(id: string) {
    setSelectedGoalIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function handleSend() {
    startTransition(async () => {
      await submitSessionNote({
        bookingId,
        therapistId,
        summary: clinicalNotes || "No additional clinical notes recorded.",
        goalsAddressed: selectedGoalIds,
        recommendations: finalSummary,
      });
      setSent(true);
      setTimeout(() => router.push("/therapist"), 1200);
    });
  }

  if (step === 1) {
    return (
      <div>
        <StepHeader
          title="Session report"
          subtitle={`${childName} · ${formatDateTime(sessionDateTime)}`}
          step={1}
          totalSteps={2}
          eyebrow="Step 1 of 2"
        />
        <div className="flex flex-col gap-6 p-6 pb-28 md:p-8">
          <div className="flex flex-col gap-2">
            <Label>Goals addressed</Label>
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals set for this child yet.</p>
            )}
            <div className="flex flex-col gap-2">
              {goals.map((goal) => {
                const checked = selectedGoalIds.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className="flex items-center gap-3 rounded-sm bg-white p-3 text-left ring-1 ring-border"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[3px]",
                        checked ? "bg-terracotta" : "border border-border"
                      )}
                    >
                      {checked && <span className="size-2 rounded-[1px] bg-white" />}
                    </span>
                    <span className="text-sm text-charcoal">{goal.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Engagement level</Label>
            <div className="flex overflow-hidden rounded-sm border border-border">
              {ENGAGEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEngagement(opt.value)}
                  className={cn(
                    "flex-1 py-2 text-sm transition-colors",
                    engagement === opt.value
                      ? "bg-terracotta text-white"
                      : "bg-white text-charcoal hover:bg-paper/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cooperation</Label>
            <Select value={cooperation} onValueChange={(v) => setCooperation(v as CooperationLevel)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COOPERATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGoalIds.length > 0 && (
            <div className="flex flex-col gap-3">
              <Label>Per-goal progress</Label>
              {selectedGoalIds.map((id) => {
                const goal = goals.find((g) => g.id === id);
                if (!goal) return null;
                return (
                  <div key={id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-charcoal">{goal.title}</span>
                    <Select
                      value={goalStatus[id]}
                      onValueChange={(v) =>
                        setGoalStatus((prev) => ({ ...prev, [id]: v as GoalStatus }))
                      }
                    >
                      <SelectTrigger size="sm" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="clinicalNotes">Clinical notes (internal only)</Label>
            <Textarea
              id="clinicalNotes"
              rows={4}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Not shown to the parent -- for your records and other clinicians only."
            />
            <p className="text-xs text-muted-foreground">Not shown to the parent.</p>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 md:sticky">
          <Button onClick={() => setStep(2)} size="lg" className="mx-auto block w-full max-w-2xl">
            Generate reports →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        title="Session report"
        subtitle={`${childName} · ${formatDateTime(sessionDateTime)}`}
        step={2}
        totalSteps={2}
        eyebrow="Step 2 of 2"
      />
      <div className="p-6 pb-28 md:p-8">
        <Tabs defaultValue="parent">
          <TabsList>
            <TabsTrigger value="clinical">Clinical record</TabsTrigger>
            <TabsTrigger value="parent">Parent summary</TabsTrigger>
          </TabsList>

          <TabsContent value="clinical" className="mt-4">
            <div className="flex flex-col gap-2.5 rounded-sm bg-white p-5 ring-1 ring-border">
              <FieldRow label="Goals addressed" value={selectedGoalIds.map((id) => goals.find((g) => g.id === id)?.title).join(", ") || "None"} />
              <FieldRow label="Engagement" value={ENGAGEMENT_OPTIONS.find((o) => o.value === engagement)?.label ?? ""} />
              <FieldRow label="Cooperation" value={COOPERATION_OPTIONS.find((o) => o.value === cooperation)?.label ?? ""} />
              {selectedGoalIds.map((id) => (
                <FieldRow
                  key={id}
                  label={goals.find((g) => g.id === id)?.title ?? id}
                  value={GOAL_STATUS_OPTIONS.find((o) => o.value === goalStatus[id])?.label ?? ""}
                />
              ))}
              <div className="mt-2 border-t border-border pt-3">
                <span className="label-micro text-muted-foreground">Clinical notes</span>
                <p className="mt-1 text-sm text-charcoal">
                  {clinicalNotes || "No additional clinical notes recorded."}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parent" className="mt-4">
            <div className="rounded-sm border-l-[3px] border-l-terracotta bg-white p-5 ring-1 ring-border">
              <span className="label-micro text-muted-foreground">
                Generated from your session ratings
              </span>
              {editedSummary === null ? (
                <p className="mt-2 text-sm leading-relaxed text-charcoal">{generated.summary}</p>
              ) : (
                <Textarea
                  className="mt-2"
                  rows={4}
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                />
              )}
              <button
                type="button"
                onClick={() => setEditedSummary(editedSummary === null ? generated.summary : null)}
                className="mt-2 text-xs font-medium text-terracotta hover:underline"
              >
                {editedSummary === null ? "Edit wording before sending" : "Revert to generated wording"}
              </button>
            </div>

            <div className="mt-4 rounded-sm bg-paper/50 p-4">
              <span className="label-micro text-muted-foreground">Built from these selections</span>
              <ul className="mt-2 flex flex-col gap-1.5">
                {generated.selections.map((s) => (
                  <li key={s.field} className="text-xs text-charcoal">
                    <span className="font-medium">{s.field}:</span> {s.phrase}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 md:sticky">
        <Button
          onClick={handleSend}
          disabled={isPending || sent}
          variant="accent"
          size="lg"
          className="mx-auto block w-full max-w-2xl"
        >
          {sent ? "Sent" : isPending ? "Sending..." : `Send parent summary to ${parentName}`}
        </Button>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-charcoal">{value}</span>
    </div>
  );
}
