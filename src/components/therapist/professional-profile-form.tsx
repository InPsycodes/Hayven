"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateTherapistProfile } from "@/lib/therapist/actions";
import type { FormState } from "@/lib/therapist/actions";

const initialState: FormState = {};

export function ProfessionalProfileForm({
  initialBio,
  initialPrice,
  initialLocation,
  initialSessionTypes,
  initialYearsPracticing,
  initialReportTone,
}: {
  initialBio: string | null;
  initialPrice: number;
  initialLocation: string | null;
  initialSessionTypes: string[];
  initialYearsPracticing: number | null;
  initialReportTone: "warm" | "direct";
}) {
  const [state, formAction, isPending] = useActionState(updateTherapistProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-sm bg-white p-5 ring-1 ring-border">
      <h2 className="font-heading text-base text-charcoal">Professional profile</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Short bio</Label>
        <Textarea id="bio" name="bio" required rows={4} defaultValue={initialBio ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Session price (NGN)</Label>
          <Input id="price" name="price" type="number" min={0} required defaultValue={initialPrice} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={initialLocation ?? ""} placeholder="Lekki, Lagos" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="yearsPracticing">Years practicing</Label>
        <Input
          id="yearsPracticing"
          name="yearsPracticing"
          type="number"
          min={0}
          defaultValue={initialYearsPracticing ?? ""}
          className="max-w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Session type</Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <Checkbox name="inPerson" defaultChecked={initialSessionTypes.includes("in_person")} />
            In-person
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <Checkbox name="virtual" defaultChecked={initialSessionTypes.includes("virtual")} />
            Virtual
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Report tone</Label>
        <p className="text-xs text-muted-foreground">
          The default voice for parent-facing report sentences. You can still change this per report when you
          generate one.
        </p>
        <RadioGroup name="reportTone" defaultValue={initialReportTone} className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <RadioGroupItem value="warm" />
            Warm
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <RadioGroupItem value="direct" />
            Direct
          </label>
        </RadioGroup>
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      {!state.error && state !== initialState && <p className="fade-in text-sm text-success-text">Saved.</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
