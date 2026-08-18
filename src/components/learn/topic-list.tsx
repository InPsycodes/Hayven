"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

interface TopicListProps {
  categories: readonly string[];
  counts: Record<string, number>;
  total: number;
}

export function TopicList({ categories, counts, total }: TopicListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "All";

  return (
    <div className="flex flex-col gap-0.5">
      {categories.map((category) => {
        const isActive = category === active;
        const count = category === "All" ? total : (counts[category] ?? 0);
        return (
          <button
            key={category}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (category === "All") params.delete("category");
              else params.set("category", category);
              const query = params.toString();
              router.push(`/learn${query ? `?${query}` : ""}`);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isActive ? "bg-terracotta text-canvas-white" : "text-charcoal hover:bg-terracotta/10"
            )}
          >
            <span>{category === "All" ? "All guides" : category}</span>
            <span className={cn("text-xs font-semibold", isActive ? "text-canvas-white/75" : "text-ink-soft")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
