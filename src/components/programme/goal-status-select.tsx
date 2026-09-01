"use client";

import { useTransition } from "react";

import { updateGoalStatus } from "@/lib/programme/actions";

const STATUSES = ["active", "met", "paused", "discontinued"] as const;

export function GoalStatusSelect({ goalId, status }: { goalId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as (typeof STATUSES)[number];
        startTransition(async () => {
          await updateGoalStatus(goalId, next);
        });
      }}
      className="h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-charcoal capitalize"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
