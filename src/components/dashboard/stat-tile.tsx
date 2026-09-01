import Link from "next/link";
import { IconArrowRight, type IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "sage" | "amber" | "ink";

const CHIP_TONE: Record<Tone, string> = {
  accent: "bg-terracotta/10 text-terracotta",
  sage: "bg-success/15 text-success-text",
  amber: "bg-amber/15 text-amber-text",
  ink: "bg-charcoal/[0.06] text-charcoal/70",
};

const PILL_TONE = {
  due: "bg-amber/15 text-amber-text",
  ok: "bg-success/15 text-success-text",
} as const;

/**
 * A single dashboard metric. The whole tile is a link to the full view --
 * the CoachPro-style "tap the number, land where it lives" behaviour. The
 * `dest` label doubles as the affordance and as a plain statement of where
 * the click goes.
 */
export function StatTile({
  icon,
  tone = "accent",
  value,
  label,
  href,
  dest,
  pill,
}: {
  icon: ComponentType<IconProps>;
  tone?: Tone;
  value: string;
  label: string;
  href: string;
  dest: string;
  pill?: { tone: keyof typeof PILL_TONE; text: string };
}) {
  const Chip = icon;
  return (
    <Link
      href={href}
      className="group/tile relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-card p-[18px] ring-1 ring-foreground/10 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(26,26,26,.06),0_22px_48px_-24px_rgba(26,26,26,.42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      {pill && (
        <span
          className={cn(
            "absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-[0.04em]",
            PILL_TONE[pill.tone]
          )}
        >
          {pill.text}
        </span>
      )}
      <span
        aria-hidden
        className={cn("mb-3.5 flex size-[34px] items-center justify-center rounded-[9px]", CHIP_TONE[tone])}
      >
        <Chip size={18} stroke={1.75} />
      </span>
      <span
        className={cn(
          "max-w-full truncate font-heading font-semibold leading-none text-charcoal",
          value.length > 7 ? "text-[22px]" : "text-[27px]"
        )}
      >
        {value}
      </span>
      <span className="mt-1.5 text-xs text-muted-foreground">{label}</span>
      <span className="mt-3 inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-terracotta">
        <span className="truncate">{dest}</span>
        <IconArrowRight
          size={13}
          stroke={2.25}
          aria-hidden
          className="shrink-0 transition-transform group-hover/tile:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
