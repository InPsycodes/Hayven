"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGoal, type FormState } from "@/lib/programme/actions";

const initialState: FormState = {};

export function GoalForm({ childId }: { childId: string }) {
  const boundAction = createGoal.bind(null, childId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-inset p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-title" className="label-micro text-muted-foreground">
            Title
          </Label>
          <Input id="goal-title" name="title" required placeholder="Increase verbal requesting" className="bg-card" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-domain" className="label-micro text-muted-foreground">
            Domain (optional)
          </Label>
          <Input id="goal-domain" name="domain" placeholder="Communication" className="bg-card" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-description" className="label-micro text-muted-foreground">
          Description (optional)
        </Label>
        <Input
          id="goal-description"
          name="description"
          placeholder="Requests preferred items using a 2-word phrase."
          className="bg-card"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-baseline" className="label-micro text-muted-foreground">
            Baseline (optional)
          </Label>
          <Input id="goal-baseline" name="baselineValue" placeholder="10" className="bg-card" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-target" className="label-micro text-muted-foreground">
            Target (optional)
          </Label>
          <Input id="goal-target" name="targetValue" placeholder="80" className="bg-card" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-unit" className="label-micro text-muted-foreground">
            Unit (optional)
          </Label>
          <Input id="goal-unit" name="unit" placeholder="percent independent" className="bg-card" />
        </div>
      </div>
      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      <Button type="submit" variant="accent" disabled={isPending} className="w-fit">
        {isPending ? "Adding..." : "Add goal"}
      </Button>
    </form>
  );
}
