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

  const isTherapist = active === "therapist";

  return (
    <div
      role="radiogroup"
      aria-label="Audience"
      className="relative flex w-full rounded-full border border-border bg-white p-0.5"
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
            onClick={() => router.push(option.value === "parent" ? "/learn" : "/learn?audience=therapist")}
            className={cn(
              "relative z-10 flex-1 rounded-full px-3 py-1.5 text-center text-sm font-medium transition-colors duration-300",
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
