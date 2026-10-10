import Link from "next/link";
import { IconArrowRight, IconCheck, IconClock } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type GettingStartedStep = {
  title: string;
  detail: string;
  /** done: finished · current: the next thing to do · waiting: in someone else's hands (e.g. verification review) · todo: later */
  state: "done" | "current" | "waiting" | "todo";
  href?: string;
  cta?: string;
};

/**
 * The first-run card on the care dashboards: a short, ordered list of the
 * steps between a new account and its first real use, with a progress bar.
 * Shown instead of the stat tiles and panels while there is nothing to put
 * in them, so a new family or therapist sees what to do rather than zeros.
 */
export function CareGettingStarted({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: GettingStartedStep[];
}) {
  const done = steps.filter((s) => s.state === "done").length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <section
      aria-labelledby="getting-started-title"
      className="mt-5 flex flex-col gap-4 rounded-2xl border border-care-accent/25 bg-gradient-to-br from-care-accent/10 to-transparent p-5 md:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="getting-started-title" className="font-heading text-lg text-care-ink md:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-care-ink-soft">{subtitle}</p>
        </div>
        <span className="font-mono text-xs text-care-ink-faint tabular-nums">
          {done} of {steps.length} done
        </span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-care-line/60"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${done} of ${steps.length} steps done`}
      >
        <div
          className="h-full rounded-full bg-care-accent transition-[width] duration-500 ease-(--ease-out) motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  step.state === "done" && "border-care-sage bg-care-sage text-white",
                  step.state === "current" && "border-care-accent bg-care-accent text-white",
                  step.state === "waiting" && "border-care-amber/60 text-care-amber",
                  step.state === "todo" && "border-care-line text-care-ink-faint"
                )}
              >
                {step.state === "done" ? (
                  <IconCheck size={14} stroke={2.5} />
                ) : step.state === "waiting" ? (
                  <IconClock size={14} stroke={2} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-care-ink">{step.title}</span>
                <span className="block text-xs text-care-ink-soft">{step.detail}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold",
                  step.state === "done" && "text-care-sage",
                  step.state === "current" && "inline-flex items-center gap-1 text-care-accent",
                  step.state === "waiting" && "text-care-amber",
                  step.state === "todo" && "text-care-ink-faint"
                )}
              >
                {step.state === "done"
                  ? "Done"
                  : step.state === "waiting"
                    ? "In review"
                    : step.cta ?? "Start"}
                {step.state === "current" && <IconArrowRight size={13} stroke={2.5} aria-hidden />}
              </span>
            </>
          );
          const rowClass = cn(
            "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
            step.state === "current" ? "border-care-accent/50 bg-care-surface" : "border-care-line/60 bg-care-surface/60"
          );
          return (
            <li key={step.title}>
              {step.href && step.state !== "done" && step.state !== "waiting" ? (
                <Link href={step.href} className={cn(rowClass, "hover:border-care-accent/60")}>
                  {body}
                </Link>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** A quiet placeholder for a dashboard section that fills in later. */
export function CareLaterNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-care-line/70 p-4">
      <p className="text-sm font-medium text-care-ink">{title}</p>
      <p className="mt-0.5 text-xs text-care-ink-soft">{text}</p>
    </div>
  );
}
