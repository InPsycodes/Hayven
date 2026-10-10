"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { setHomePracticeNextStep } from "@/lib/home-practice/actions";
import type { HomePracticeNextStep } from "@/lib/home-practice/types";

const CHOICES: { step: "keep" | "change" | "done"; label: string; hint: string }[] = [
  { step: "keep", label: "Keep it", hint: "Stays on the family's list after your next session." },
  { step: "change", label: "Change it", hint: "Replaced by what you set at your next session." },
  { step: "done", label: "Mark it done", hint: "Taken off the family's list now." },
];

export function HomePracticeNextStepButtons({
  activityId,
  current,
}: {
  activityId: string;
  current: HomePracticeNextStep | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<HomePracticeNextStep | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const choose = (step: "keep" | "change" | "done") => {
    // Tapping the chosen option again clears it.
    const next = step !== "done" && selected === step ? "clear" : step;
    setError(null);
    startTransition(async () => {
      const result = await setHomePracticeNextStep(activityId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (next !== "done") setSelected(next === "clear" ? null : next);
      router.refresh();
    });
  };

  const hint = CHOICES.find((c) => c.step === selected)?.hint;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Next week:</span>
        {CHOICES.map((c) => (
          <button
            key={c.step}
            type="button"
            title={c.hint}
            disabled={isPending}
            aria-pressed={c.step !== "done" ? selected === c.step : undefined}
            onClick={() => choose(c.step)}
            className={cn(
              "rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
              selected === c.step
                ? "border-terracotta bg-terracotta text-white"
                : "border-border text-charcoal hover:border-charcoal/40"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-error-text">{error}</p>}
    </div>
  );
}
