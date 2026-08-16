import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";

import { DASHBOARD_PREVIEW, DASHBOARD_CHECKLIST } from "@/content/marketing/dashboard-preview";

export function DashboardPreview() {
  return (
    <section className="px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="rounded-[1.75rem] border border-charcoal/8 bg-canvas-white p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-charcoal/8 pb-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-charcoal/10 font-serif text-sm text-charcoal">
                {DASHBOARD_PREVIEW.childInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal">{DASHBOARD_PREVIEW.childName}</p>
                <p className="truncate text-xs text-ink-soft">{DASHBOARD_PREVIEW.meta}</p>
              </div>
              <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-[#4a5540]">
                {DASHBOARD_PREVIEW.statusLabel}
              </span>
            </div>

            <div className="flex flex-col gap-3 border-b border-charcoal/8 py-5">
              {DASHBOARD_PREVIEW.progress.map((row) => (
                <div key={row.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span>{row.label}</span>
                    <span>{row.value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/8">
                    <div
                      className="h-full rounded-full bg-terracotta"
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                </div>
              ))}
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
