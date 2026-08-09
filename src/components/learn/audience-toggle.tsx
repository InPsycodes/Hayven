"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Audience } from "@/data/articles";

const OPTIONS: { value: Audience; label: string }[] = [
  { value: "parent", label: "For parents" },
  { value: "therapist", label: "For therapists" },
];

export function AudienceToggle({ active }: { active: Audience }) {
  const router = useRouter();

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-border">
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => router.push(option.value === "parent" ? "/learn" : "/learn?audience=therapist")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-charcoal text-offwhite" : "bg-transparent text-charcoal hover:bg-paper"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
