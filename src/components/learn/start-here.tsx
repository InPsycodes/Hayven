import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { LEARN_PATHS } from "@/content/marketing/learn-paths";

/**
 * The "Start here" band on /learn -- three curated entry points keyed to
 * what a parent has actually noticed, each linking to a filtered guide view
 * (/learn?path=<slug>). `counts` is keyed by path slug.
 */
export function StartHere({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {LEARN_PATHS.map((path) => (
        <Link
          key={path.slug}
          href={`/learn?path=${path.slug}`}
          className="group flex flex-col gap-2 rounded-2xl bg-canvas-white p-5 ring-1 ring-charcoal/10 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] transition-all hover:-translate-y-0.5 hover:ring-charcoal/20"
        >
          <Icon icon={path.icon} size="md" className="text-terracotta" />
          <h3 className="mt-1 font-serif text-base leading-snug text-charcoal">{path.title}</h3>
          <p className="text-sm leading-relaxed text-ink-soft">{path.blurb}</p>
          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-rust-dark">
            {counts[path.slug] ?? 0} guides
            <IconArrowRight
              size={13}
              stroke={2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      ))}
    </div>
  );
}
