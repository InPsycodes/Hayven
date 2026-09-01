import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * A dashboard panel that is itself a link to the section it summarises.
 * Renders label -> children -> a "go" footer that names the destination.
 * Use `<PanelCard.Static>` for a panel whose rows link individually (a
 * message list, say) so we don't nest an <a> inside an <a>.
 */
export function PanelCard({
  label,
  href,
  dest,
  className,
  children,
  headerRight,
}: {
  label: string;
  href: string;
  dest: string;
  className?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/panel flex min-w-0 flex-col overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(26,26,26,.06),0_22px_48px_-24px_rgba(26,26,26,.42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta",
        className
      )}
    >
      <PanelHead label={label} right={headerRight} />
      {children}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-terracotta">
        {dest}
        <IconArrowRight size={13} stroke={2.25} className="transition-transform group-hover/panel:translate-x-0.5" />
      </span>
    </Link>
  );
}

function PanelHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="label-micro text-muted-foreground">{label}</span>
      {right}
    </div>
  );
}

/**
 * A panel whose interactive elements are its own rows -- no outer link, so
 * inner <Link>s are valid. Still gets an optional "go" footer link.
 */
function StaticPanel({
  label,
  className,
  children,
  headerRight,
  footer,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: { href: string; dest: string };
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/10",
        className
      )}
    >
      <PanelHead label={label} right={headerRight} />
      {children}
      {footer && (
        <Link
          href={footer.href}
          className="group/f mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-terracotta hover:underline"
        >
          {footer.dest}
          <IconArrowRight size={13} stroke={2.25} className="transition-transform group-hover/f:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

PanelCard.Static = StaticPanel;
