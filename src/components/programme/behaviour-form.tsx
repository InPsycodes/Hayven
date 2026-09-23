"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTargetBehaviour, type FormState } from "@/lib/programme/actions";

const initialState: FormState = {};

const MEASUREMENTS = [
  { value: "frequency", label: "Frequency (count)" },
  { value: "duration", label: "Duration (seconds)" },
  { value: "intensity", label: "Intensity (1-5)" },
  { value: "percent", label: "Percent of intervals" },
  { value: "latency", label: "Latency (seconds)" },
];

export function BehaviourForm({ childId }: { childId: string }) {
  const boundAction = createTargetBehaviour.bind(null, childId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-inset p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="behaviour-label" className="label-micro text-muted-foreground">
            Label
          </Label>
          <Input id="behaviour-label" name="label" required placeholder="Elopement" className="bg-card" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="behaviour-parent-label" className="label-micro text-muted-foreground">
            Parent-facing name (optional)
          </Label>
          <Input
            id="behaviour-parent-label"
            name="parentLabel"
            placeholder="leaving the activity area"
            className="bg-card"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="behaviour-definition" className="label-micro text-muted-foreground">
          Definition (optional)
        </Label>
        <Input
          id="behaviour-definition"
          name="definition"
          placeholder="Leaving the designated therapy area without permission."
          className="bg-card"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="label-micro text-muted-foreground">Direction</Label>
          <div className="flex h-9 items-center gap-4 rounded-lg border border-input bg-card px-3 text-sm text-charcoal">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="direction" value="decrease" defaultChecked required />
              Decrease
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="direction" value="increase" />
              Increase
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="behaviour-measurement" className="label-micro text-muted-foreground">
            Measured by
          </Label>
          <select
            id="behaviour-measurement"
            name="measurement"
            defaultValue="frequency"
            className="h-9 rounded-sm border border-border bg-card px-2 text-sm"
          >
            {MEASUREMENTS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      <Button type="submit" variant="accent" disabled={isPending} className="w-fit">
        {isPending ? "Adding..." : "Add target behaviour"}
      </Button>
    </form>
  );
}
