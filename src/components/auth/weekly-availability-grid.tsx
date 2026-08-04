"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyAvailabilityGrid() {
  const [available, setAvailable] = useState<boolean[]>([true, true, true, true, true, false, false]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((day, i) => (
          <button
            key={day}
            type="button"
            onClick={() =>
              setAvailable((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
            }
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-sm px-1 py-3 text-[11px] font-medium transition-colors",
              available[i] ? "bg-terracotta text-white" : "bg-paper text-charcoal/60"
            )}
          >
            {day}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tap a day to set specific hours. You can adjust this anytime.
      </p>
    </div>
  );
}
