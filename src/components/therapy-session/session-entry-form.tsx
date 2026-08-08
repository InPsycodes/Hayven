"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTherapySession, type FormState } from "@/lib/therapy-sessions/actions";
import type { ChildProgramme } from "@/lib/therapy-sessions/types";

const MEASUREMENT_LABEL: Record<string, string> = {
  frequency: "Count this session",
  duration: "Total duration (seconds)",
  intensity: "Intensity (1-5)",
  percent: "Percent of intervals",
  latency: "Latency (seconds)",
};

const PROMPT_LEVELS = [
  { value: "independent", label: "Independent" },
  { value: "gestural", label: "Gestural" },
  { value: "verbal", label: "Verbal" },
  { value: "partial_physical", label: "Partial physical" },
  { value: "full_physical", label: "Full physical" },
];

const initialState: FormState = {};

export function SessionEntryForm({
  childId,
  childName,
  programme,
}: {
  childId: string;
  childName: string;
  programme: ChildProgramme;
}) {
  const boundAction = createTherapySession.bind(null, childId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8 p-6 pb-28 md:p-8">
      <div className="flex flex-col gap-2">
        <Label>Session basics</Label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sessionDate">Date</Label>
            <Input
              id="sessionDate"
              name="sessionDate"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input id="durationMinutes" name="durationMinutes" type="number" min={1} placeholder="45" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Setting</Label>
            <div className="flex gap-4 pt-2 text-sm text-charcoal">
              <label className="flex items-center gap-2">
                <input type="radio" name="setting" value="in_person" defaultChecked required />
                In-person
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="setting" value="virtual" />
                Virtual
              </label>
            </div>
          </div>
        </div>
      </div>

      {programme.targetBehaviours.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label>Target behaviours</Label>
          {programme.targetBehaviours.map((behaviour) => (
            <div key={behaviour.id} className="flex flex-col gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
              <p className="text-sm font-medium text-charcoal">
                {behaviour.label}{" "}
                <span className="text-xs font-normal text-muted-foreground">({behaviour.direction})</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`behaviour_${behaviour.id}_value`} className="text-xs">
                    {MEASUREMENT_LABEL[behaviour.measurement]}
                  </Label>
                  <Input id={`behaviour_${behaviour.id}_value`} name={`behaviour_${behaviour.id}_value`} type="number" min={0} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`behaviour_${behaviour.id}_antecedent`} className="text-xs">
                    Antecedent
                  </Label>
                  <Input id={`behaviour_${behaviour.id}_antecedent`} name={`behaviour_${behaviour.id}_antecedent`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`behaviour_${behaviour.id}_consequence`} className="text-xs">
                    Consequence
                  </Label>
                  <Input id={`behaviour_${behaviour.id}_consequence`} name={`behaviour_${behaviour.id}_consequence`} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`behaviour_${behaviour.id}_parent_label`} className="text-xs">
                  Parent-facing name (optional)
                </Label>
                <Input
                  id={`behaviour_${behaviour.id}_parent_label`}
                  name={`behaviour_${behaviour.id}_parent_label`}
                  placeholder={`How to describe "${behaviour.label}" to a parent, e.g. "leaving the activity area"`}
                  defaultValue={behaviour.parentLabel ?? ""}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {programme.skills.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label>Skills</Label>
          {programme.skills.map((skill) => (
            <div key={skill.id} className="flex flex-col gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
              <p className="text-sm font-medium text-charcoal">{skill.label}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`skill_${skill.id}_total`} className="text-xs">
                    Trials total
                  </Label>
                  <Input id={`skill_${skill.id}_total`} name={`skill_${skill.id}_total`} type="number" min={0} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`skill_${skill.id}_correct`} className="text-xs">
                    Trials correct
                  </Label>
                  <Input id={`skill_${skill.id}_correct`} name={`skill_${skill.id}_correct`} type="number" min={0} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`skill_${skill.id}_prompt`} className="text-xs">
                    Prompt level
                  </Label>
                  <select
                    id={`skill_${skill.id}_prompt`}
                    name={`skill_${skill.id}_prompt`}
                    className="h-9 rounded-sm border border-border bg-white px-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">Not recorded</option>
                    {PROMPT_LEVELS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {programme.goals.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label>Goal progress</Label>
          {programme.goals.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
              <span className="text-sm text-charcoal">{goal.title}</span>
              <div className="flex items-center gap-2">
                <Input
                  id={`goal_${goal.id}_percent`}
                  name={`goal_${goal.id}_percent`}
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  placeholder="0-100"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Label>Reinforcers used (optional)</Label>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
            <Input name={`reinforcer_${i}_label`} placeholder="e.g. Bubbles" />
            <select
              name={`reinforcer_${i}_effectiveness`}
              className="h-9 w-32 rounded-sm border border-border bg-white px-2 text-sm"
              defaultValue=""
            >
              <option value="">Effectiveness</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="therapistNotes">Session notes</Label>
        <Textarea
          id="therapistNotes"
          name="therapistNotes"
          rows={4}
          placeholder={`How did the session with ${childName} go? This feeds the generated report.`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confidentialNote">Confidential note (optional)</Label>
        <Textarea id="confidentialNote" name="confidentialNote" rows={3} />
        <p className="text-xs text-muted-foreground">
          Internal only. Never shared with the parent and never sent to the report generator.
        </p>
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 md:sticky">
        <Button type="submit" disabled={isPending} size="lg" className="mx-auto block w-full max-w-2xl">
          {isPending ? "Saving..." : "Save session"}
        </Button>
      </div>
    </form>
  );
}
