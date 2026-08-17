import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";

import { DASHBOARD_PREVIEW, DASHBOARD_CHECKLIST } from "@/content/marketing/dashboard-preview";
import { Icon } from "@/components/ui/icon";

// Meaningful, not decorative: a row crossing into "strong progress" reads as
// sage/success instead of the default terracotta, the same way a real
// progress view would flag it.
const STRONG_PROGRESS_THRESHOLD = 75;

export function DashboardPreview() {
  return (
    <section className="px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="rounded-[1.75rem] border-[1.5px] border-terracotta/70 bg-canvas-white p-6 shadow-[0_20px_60px_-15px_rgba(26,18,12,0.3),0_0_70px_-8px_rgba(156,89,52,0.45)]">
            <div className="flex items-center gap-3 border-b border-charcoal/8 pb-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-terracotta/25 bg-terracotta/12 font-serif text-sm text-rust-dark">
                {DASHBOARD_PREVIEW.childInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal">{DASHBOARD_PREVIEW.childName}</p>
                <p className="text-xs text-ink-soft">{DASHBOARD_PREVIEW.meta}</p>
              </div>
              <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-[#4a5540]">
                {DASHBOARD_PREVIEW.statusLabel}
              </span>
            </div>

            <div className="flex flex-col gap-3 border-b border-charcoal/8 py-5">
              {DASHBOARD_PREVIEW.progress.map((row) => {
                const isStrong = row.value >= STRONG_PROGRESS_THRESHOLD;
                return (
                  <div key={row.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-ink-soft">
                      <span className="flex items-center gap-1.5">
                        <Icon
                          icon={row.icon}
                          size="sm"
                          className={isStrong ? "text-success" : "text-terracotta"}
                        />
                        {row.label}
                      </span>
                      <span className="font-medium text-charcoal">{row.value}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
                      <div
                        className={`h-full rounded-full ${isStrong ? "bg-success" : "bg-terracotta"}`}
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-5">
              <div>
                <p className="text-sm font-medium text-charcoal">{DASHBOARD_PREVIEW.footerLabel}</p>
                <p className="text-xs text-ink-soft">{DASHBOARD_PREVIEW.footerTime}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-terracotta px-4 py-2 text-xs font-medium text-terracotta transition-colors hover:bg-terracotta hover:text-canvas-white"
              >
                View notes
              </button>
            </div>
          </div>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <span className="eyebrow text-rust-dark">Progress & support</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            One dashboard for every appointment, note and next step.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
            Parents see exactly what&apos;s coming up and what&apos;s already happened. No more
            piecing it together from messages and memory.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {DASHBOARD_CHECKLIST.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-charcoal">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-terracotta/12 text-terracotta">
                  <IconCheck size={13} stroke={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/parent"
            className="mt-8 inline-block border-b-2 border-terracotta pb-1 text-sm font-medium text-charcoal transition-colors hover:text-terracotta"
          >
            See a parent dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
