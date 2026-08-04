"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/data/articles";

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "All";

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const isActive = category === active;
        return (
          <button
            key={category}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (category === "All") params.delete("category");
              else params.set("category", category);
              router.push(`/learn?${params.toString()}`);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              isActive
                ? "border-charcoal bg-charcoal text-offwhite"
                : "border-border bg-transparent text-charcoal hover:border-charcoal/40"
            )}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
