import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";
import type { LearningAudience } from "@/lib/learning/queries";

/**
 * Visual "browse by topic" grid -- replaces the old plain-text sidebar menu.
 * Uses the icon + tint each category already has in LEARN_TOPIC_META.
 */
export function TopicGrid({
  categories,
  counts,
  audience,
}: {
  categories: { name: string }[];
  counts: Record<string, number>;
  audience: LearningAudience;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => {
        const meta = LEARN_TOPIC_META[category.name];
        const count = counts[category.name] ?? 0;
        const params = new URLSearchParams();
        if (audience === "therapist") params.set("audience", "therapist");
        params.set("category", category.name);

        return (
          <Link
            key={category.name}
            href={`/learn?${params.toString()}`}
            className="group flex flex-col gap-2 rounded-2xl bg-canvas-white p-4 ring-1 ring-charcoal/10 transition-colors hover:ring-terracotta/40"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-xl ${
                meta?.tileClass ?? "bg-paper text-ink-soft"
              }`}
            >
              {meta && <Icon icon={meta.icon} size="sm" />}
            </span>
            <span className="text-sm font-medium text-charcoal group-hover:text-rust-dark">
              {category.name}
            </span>
            <span className="text-xs text-ink-soft">
              {count} guide{count === 1 ? "" : "s"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
