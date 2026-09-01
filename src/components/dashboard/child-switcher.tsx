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

  if (kids.length <= 1) return null;

  function selectChild(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("child", id);
    router.push(`/parent?${params.toString()}`);
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
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
                ? "border-care-accent bg-care-accent/15 text-care-ink"
                : "border-care-line text-care-ink-soft hover:border-care-ink-faint"
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
                active ? "bg-care-accent text-white" : "bg-care-raised text-care-ink-soft"
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
