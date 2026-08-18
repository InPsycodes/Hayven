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
    <div className="flex w-full overflow-hidden rounded-full border border-border p-0.5">
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => router.push(option.value === "parent" ? "/learn" : "/learn?audience=therapist")}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-medium transition-colors",
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
