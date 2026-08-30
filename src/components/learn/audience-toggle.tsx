"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { LearningAudience } from "@/lib/learning/queries";

const OPTIONS: { value: LearningAudience; label: string }[] = [
  { value: "parent", label: "For parents" },
  { value: "therapist", label: "For therapists" },
];

function hrefFor(value: LearningAudience) {
  return value === "parent" ? "/learn" : "/learn?audience=therapist";
}

export function AudienceToggle({ active }: { active: LearningAudience }) {
  const router = useRouter();

  const isTherapist = active === "therapist";

  return (
    <div
      role="radiogroup"
      aria-label="Audience"
      className="relative flex w-full rounded-full border border-border bg-white p-0.5"
      onKeyDown={(e) => {
        // ARIA APG radiogroup pattern: arrow keys move selection between
        // options, not just Tab -- only two options here, so any
        // horizontal/vertical arrow just flips to the other one.
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        const other = OPTIONS.find((o) => o.value !== active);
        if (other) router.push(hrefFor(other.value));
      }}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-charcoal transition-transform duration-300 ease-out",
          isTherapist && "translate-x-full"
        )}
      />
      {OPTIONS.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => router.push(hrefFor(option.value))}
            className={cn(
              "relative z-10 flex-1 rounded-full px-3 py-1.5 text-center text-sm font-medium outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-terracotta/40",
              isActive ? "text-offwhite" : "text-charcoal hover:text-rust-dark"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
