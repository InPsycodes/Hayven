import Link from "next/link";
import type { ComponentType } from "react";
import { type IconProps } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * A dashboard metric card, care-portal style: label + icon, a big value,
 * an optional delta, and an optional progress bar (only where the value is
 * a ratio -- counts and money get the delta + a sub line instead).
 */
export function CareStat({
  icon,
  label,
  value,
  delta,
  sub,
  bar,
  href,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  value: string;
  delta?: { text: string; good?: boolean };
  sub?: string;
  /** 0-100; renders the progress bar when set. `tone` picks the fill colour. */
  bar?: { pct: number; tone: "accent" | "sage" };
  href: string;
}) {
  const Icon = icon;
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-2xl border border-care-line/60 bg-care-surface p-4 transition-colors hover:border-care-line"
    >
      <div className="flex items-center justify-between text-[11px] text-care-ink-soft">
        <span className="truncate">{label}</span>
        <Icon size={16} stroke={1.7} aria-hidden className="shrink-0 text-care-ink-faint" />
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[28px] font-bold leading-none tracking-tight text-care-ink">{value}</span>
        {delta && (
          <span className={cn("text-xs font-semibold", delta.good === false ? "text-care-amber" : "text-care-sage")}>
            {delta.text}
          </span>
        )}
      </div>
      {bar ? (
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-care-bg">
          <span
            className={cn(
              "block h-full rounded-full",
              bar.tone === "sage"
                ? "bg-gradient-to-r from-care-sage to-care-green"
                : "bg-gradient-to-r from-care-accent-deep to-care-accent"
            )}
            style={{ width: `${Math.max(4, Math.min(100, bar.pct))}%` }}
          />
        </span>
      ) : (
        <span className="mt-3 block h-1.5" />
      )}
      {sub && <span className="mt-2 text-[11px] text-care-ink-faint">{sub}</span>}
    </Link>
  );
}
