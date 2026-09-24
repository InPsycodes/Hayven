import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

function Head({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-care-ink-soft">
      <span>{label}</span>
      {right}
    </div>
  );
}

/** A care-portal card that is itself a link to the section it summarises. */
export function CarePanel({
  label,
  href,
  right,
  className,
  children,
  accent,
}: {
  label: string;
  href: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** Warm accent tint (the "next appointment" treatment). */
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 flex-col rounded-2xl border p-4 transition-colors",
        accent
          ? "border-care-accent/25 bg-gradient-to-br from-care-accent/12 to-transparent hover:border-care-accent/40"
          : "border-care-line/60 bg-care-surface hover:border-care-line",
        className
      )}
    >
      <Head label={label} right={right} />
      {children}
    </Link>
  );
}

/** A care-portal card whose rows link individually -- no outer <a>. */
function StaticPanel({
  label,
  right,
  className,
  children,
  footer,
}: {
  label: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  footer?: { href: string; label: string };
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-care-line/60 bg-care-surface p-4",
        className
      )}
    >
      <Head label={label} right={right} />
      {children}
      {footer && (
        <Link
          href={footer.href}
          className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-semibold text-care-accent hover:underline pointer-coarse:min-h-11 pointer-coarse:items-end"
        >
          {footer.label}
          <IconArrowRight size={12} stroke={2.5} aria-hidden />
        </Link>
      )}
    </div>
  );
}

CarePanel.Static = StaticPanel;
