"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealIntakeForm } from "@/lib/intake/queries";
import { saveIntakeForm, type IntakeFormInput } from "@/lib/intake/actions";

const FIELDS: { key: keyof IntakeFormInput; label: string; helper: string; placeholder: string }[] = [
  {
    key: "sensoryProfile",
    label: "Sensory profile",
    helper: "Anything that overwhelms or soothes them -- sounds, textures, lighting, movement.",
    placeholder: "e.g. Covers ears around loud/sudden noises. Calms down with deep pressure (tight hugs, weighted blanket).",
  },
  {
    key: "medicalHistory",
    label: "Medical history",
    helper: "Diagnoses, medications, allergies, or past evaluations worth knowing upfront.",
    placeholder: "e.g. No formal diagnosis yet. No known allergies. Sees a pediatrician every 6 months.",
  },
  {
    key: "consentSharing",
    label: "Consent & sharing",
    helper: "Who else is involved in their care, and what's okay to share with them.",
    placeholder: "e.g. Okay to share session updates with grandmother, who does pickup twice a week.",
  },
  {
    key: "homeRoutine",
    label: "Home routine survey",
    helper: "A typical day -- sleep, meals, screen time, anything that helps a therapist meet them where they are.",
    placeholder: "e.g. Wakes around 7am, one nap after lunch, gets overwhelmed in the hour before bedtime.",
  },
];

export function IntakeForm({ childId, childName, initial }: { childId: string; childName: string; initial: RealIntakeForm | null }) {
  const router = useRouter();
  const [values, setValues] = useState<IntakeFormInput>({
    sensoryProfile: initial?.sensoryProfile ?? "",
    medicalHistory: initial?.medicalHistory ?? "",
    consentSharing: initial?.consentSharing ?? "",
    homeRoutine: initial?.homeRoutine ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveIntakeForm(childId, values);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      setSaved(true);
      reset();
      router.refresh();
    });
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        This stays with {childName}&apos;s file and is shared with their assigned therapist so the first
        session doesn&apos;t start from zero. Fill in what you can now -- you can always come back and add more.
      </p>

      {FIELDS.map((field) => {
        const complete = Boolean(values[field.key].trim());
        return (
          <div key={field.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.key}>{field.label}</Label>
              <StatusBadge tone={complete ? "sage" : "grey"}>{complete ? "Complete" : "Due"}</StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">{field.helper}</p>
            <Textarea
              id={field.key}
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              rows={4}
              placeholder={field.placeholder}
            />
          </div>
        );
      })}

      {error && <p className="text-sm text-error-text">{error}</p>}
      {saved && !error && <p className="text-sm text-success-text">Saved.</p>}

      <Button type="submit" variant="accent" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save intake form"}
      </Button>
    </form>
  );
}
