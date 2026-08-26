import Link from "next/link";
import { IconCheck, IconStar, IconFileText } from "@tabler/icons-react";

import {
  DASHBOARD_PREVIEW,
  DASHBOARD_CHECKLIST,
  DASHBOARD_FEATURE_CARDS,
} from "@/content/marketing/dashboard-preview";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/marketing/reveal";

const CHART_WIDTH = 200;
const CHART_HEIGHT = 90;
const CHART_MAX = 100;

function chartPoints(values: number[]): string {
  const step = CHART_WIDTH / (values.length - 1);
  return values.map((v, i) => `${i * step},${CHART_HEIGHT - (v / CHART_MAX) * CHART_HEIGHT}`).join(" ");
}

function DashboardMini() {
  const { communication, social } = DASHBOARD_PREVIEW.goalProgress;
  const commPoints = chartPoints(communication);
  const socialPoints = chartPoints(social);
  const commNow = communication[communication.length - 1];
  const socialNow = social[social.length - 1];

  return (
    <div className="flex size-full flex-col justify-between p-8">
      <div className="flex items-start justify-between">
        <div className="flex gap-8">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-canvas-white/50">
              <span className="size-2 rounded-full bg-success" /> Communication
            </p>
            <p className="mt-1 font-serif text-4xl text-canvas-white">{commNow}%</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-canvas-white/50">
              <span className="size-2 rounded-full bg-terracotta" /> Social
            </p>
            <p className="mt-1 font-serif text-4xl text-canvas-white">{socialNow}%</p>
          </div>
        </div>
        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">On track</span>
      </div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-32 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dashboard-mini-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${CHART_HEIGHT} ${commPoints} ${CHART_WIDTH},${CHART_HEIGHT}`} fill="url(#dashboard-mini-fill)" />
        <polyline points={socialPoints} fill="none" stroke="var(--terracotta)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={commPoints} fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function SessionsMini() {
  const { nextAppointment, sessionNotes } = DASHBOARD_PREVIEW;
  return (
    <div className="flex size-full flex-col justify-center gap-5 p-8">
      <div className="rounded-xl bg-terracotta/15 p-5 ring-1 ring-terracotta/30">
        <p className="text-xs font-semibold tracking-[0.06em] text-terracotta uppercase">Next session</p>
        <p className="mt-1.5 text-lg font-medium text-canvas-white">{nextAppointment.label}</p>
        <p className="text-sm text-canvas-white/55">
          {nextAppointment.time} · {nextAppointment.location}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {sessionNotes.map((note, i) => (
          <div key={i} className="flex gap-2.5">
            <Icon
              icon={IconStar}
              size="sm"
              className={i === 0 ? "mt-0.5 shrink-0 text-terracotta" : "mt-0.5 shrink-0 text-canvas-white/25"}
            />
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-canvas-white/70">&ldquo;{note.quote}&rdquo;</p>
              <p className="mt-1 text-xs text-canvas-white/40">
                {note.author} · {note.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntakeMini() {
  const { intakeForms } = DASHBOARD_PREVIEW;
  const complete = intakeForms.filter((f) => f.status === "complete").length;
  return (
    <div className="flex size-full flex-col justify-center gap-6 p-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-canvas-white/50">Intake form</p>
        <span className="font-serif text-2xl text-canvas-white">
          {complete}/{intakeForms.length}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {intakeForms.map((form) => (
          <div key={form.label} className="flex items-center justify-between border-b border-white/8 pb-4 text-sm last:border-b-0 last:pb-0">
            <span className="text-canvas-white/70">{form.label}</span>
            {form.status === "complete" ? (
              <Icon icon={IconCheck} size="md" className="text-success" />
            ) : (
              <span className="text-xs font-medium text-amber">Due</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsMini() {
  const { reports } = DASHBOARD_PREVIEW;
  return (
    <div className="flex size-full flex-col justify-center gap-6 p-8">
      {reports.map((report) => (
        <div key={report.label} className="flex items-center gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-canvas-white/50">
            <Icon icon={IconFileText} size="md" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-canvas-white/85">{report.label}</p>
            <p className="text-xs text-canvas-white/40">{report.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const PREVIEWS: Record<string, () => React.ReactElement> = {
  dashboard: DashboardMini,
  sessions: SessionsMini,
  intake: IntakeMini,
  reports: ReportsMini,
};

export function DashboardPreview() {
  return (
    <section className="px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Progress & support</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Everything about your child&apos;s care, on one screen.
          </h2>
          <Link
            href="/parent"
            className="mt-4 inline-block border-b-2 border-terracotta pb-1 text-sm font-medium text-charcoal transition-colors hover:text-terracotta"
          >
            See a parent dashboard
          </Link>
        </div>

        {/* Illustrative-only mock of parent-dashboard features -- not a live
            screenshot, see src/content/marketing/dashboard-preview.ts. */}
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {DASHBOARD_FEATURE_CARDS.map((card, index) => {
            const Preview = PREVIEWS[card.key];
            return (
              <Reveal key={card.key} delayMs={index * 80} className="h-full">
                <div className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border-[1.5px] border-terracotta/70 bg-canvas-white shadow-[0_20px_60px_-15px_rgba(26,18,12,0.3),0_0_70px_-8px_rgba(156,89,52,0.45)] transition-all hover:-translate-y-1 hover:border-terracotta hover:shadow-[0_24px_64px_-14px_rgba(26,18,12,0.32),0_0_80px_-6px_rgba(156,89,52,0.55)]">
                  <div className="relative aspect-4/3 shrink-0 overflow-hidden bg-charcoal">
                    <Preview />
                  </div>
                  <div className="p-8">
                    <div className="relative -mt-[52px] flex size-10 items-center justify-center rounded-xl border border-charcoal/8 bg-canvas-white text-terracotta">
                      <Icon icon={card.icon} size="md" />
                    </div>
                    <h3 className="mt-4 font-serif text-xl text-charcoal">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{card.description}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {DASHBOARD_CHECKLIST.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-charcoal">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-terracotta/12 text-terracotta">
                <IconCheck size={13} stroke={2.5} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
