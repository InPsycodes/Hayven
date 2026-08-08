"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSkill, type FormState } from "@/lib/programme/actions";

const initialState: FormState = {};

export function SkillForm({ childId }: { childId: string }) {
  const boundAction = createSkill.bind(null, childId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="skill-label" className="label-micro text-muted-foreground">
          Label
        </Label>
        <Input id="skill-label" name="label" required placeholder="Two-word phrase requesting" className="bg-white" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="skill-mastery" className="label-micro text-muted-foreground">
          Mastery criteria (optional)
        </Label>
        <Input
          id="skill-mastery"
          name="masteryCriteria"
          placeholder="80% independent across 3 consecutive sessions."
          className="bg-white"
        />
      </div>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <Button type="submit" variant="accent" disabled={isPending} className="w-fit">
        {isPending ? "Adding..." : "Add skill"}
      </Button>
    </form>
  );
}
