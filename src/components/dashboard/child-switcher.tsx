"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { ageFromDob, initialsFromName } from "@/data/format";

export interface SwitcherChild {
  id: string;
  firstName: string;
  dateOfBirth: string;
}

export function ChildSwitcher({ kids, activeId }: { kids: SwitcherChild[]; activeId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (kids.length === 0) return null;

  function selectChild(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("child", id);
    router.push(`/parent?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 px-5 md:px-10">
      {kids.map((child) => {
        const active = child.id === activeId;
        return (
          <button
            key={child.id}
            type="button"
            onClick={() => selectChild(child.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-charcoal bg-charcoal text-offwhite"
                : "border-border text-charcoal hover:border-charcoal/40"
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[10px] font-medium",
                active ? "bg-terracotta text-white" : "bg-paper text-charcoal"
              )}
            >
              {initialsFromName(child.firstName)}
            </span>
            {child.firstName}, {ageFromDob(child.dateOfBirth)}
          </button>
        );
      })}
    </div>
  );
}
