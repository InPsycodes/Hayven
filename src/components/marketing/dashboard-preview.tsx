import Link from "next/link";
import {
  IconArrowRight,
  IconBulb,
  IconCalendarEvent,
  IconChartLine,
  IconFileText,
  IconHome,
  IconMessage,
  IconMessageCircle,
  IconRosetteDiscountCheckFilled,
  IconSettings,
  IconVideo,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

import { DASHBOARD_NAV, PROGRESS_PREVIEW, SUPPORT_POINTS } from "@/content/marketing/dashboard-preview";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const NAV_ICON: Record<string, ComponentType<IconProps>> = {
  Home: IconHome,
  Progress: IconChartLine,
  Sessions: IconCalendarEvent,
  Reports: IconFileText,
  Messages: IconMessage,
  Settings: IconSettings,
};

/** Maps a 0-100 series onto the chart's 200x76 viewBox. */
function line(values: number[]): string {
  const n = values.length;
  return values.map((v, i) => `${(i / (n - 1)) * 200},${76 - (v / 100) * 76}`).join(" ");
}

function HayvenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2c1.8 2.8 1.8 5.7 0 8.5-1.8-2.8-1.8-5.7 0-8.5Zm0 20c-1.8-2.8-1.8-5.7 0-8.5 1.8 2.8 1.8 5.7 0 8.5ZM2 12c2.8-1.8 5.7-1.8 8.5 0-2.8 1.8-5.7 1.8-8.5 0Zm20 0c-2.8 1.8-5.7 1.8-8.5 0 2.8-1.8 5.7-1.8 8.5 0Z" />
    </svg>
  );
}

function ChildAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <rect width="40" height="40" fill="#c98a5f" />
      <circle cx="11" cy="13" r="5.5" fill="#3a2a20" />
      <circle cx="29" cy="13" r="5.5" fill="#3a2a20" />
      <path d="M9 20c0-7 4.5-11 11-11s11 4 11 11" fill="#3a2a20" />
      <circle cx="20" cy="22" r="8.5" fill="#8a5a3c" />
      <path d="M11 40c0-6 4-10 9-10s9 4 9 10Z" fill="#e6dbc6" />
    </svg>
  );
}

function DashBar({ pct }: { pct: number }) {
  return (
    <div className="mt-1.5 h-[3.5px] overflow-hidden rounded-full bg-[#ede4d3]/12">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#7f9560] to-[#a0b47c]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* the dark dashboard mock                                                    */
/* -------------------------------------------------------------------------- */

function Dashboard() {
  const p = PROGRESS_PREVIEW;
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-black/40 bg-[#1c1813] text-[#ede4d3] shadow-[0_2px_6px_rgba(0,0,0,0.26),0_46px_84px_-38px_rgba(30,22,15,0.5)] sm:grid-cols-[128px_1fr]">
      {/* sidebar */}
      <nav className="flex gap-1 overflow-x-auto border-b border-white/[0.08] p-2.5 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-r sm:border-b-0 sm:p-2.5">
        <span className="hidden items-center gap-1.5 px-2 pt-1 pb-3 text-[9.5px] font-bold tracking-[0.12em] sm:flex">
          <HayvenMark className="size-3 text-[#b0693c]" />
          HAYVEN
        </span>
        {DASHBOARD_NAV.map((label, i) => {
          const I = NAV_ICON[label];
          return (
            <span
              key={label}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-[7px] px-2 py-1.5 text-[10.5px]",
                i === 0 ? "bg-[#b0693c]/20 font-medium text-[#ede4d3]" : "text-[#b3a893]"
              )}
            >
              {I ? <I size={12} stroke={1.8} /> : null}
              {label}
            </span>
          );
        })}
      </nav>

      {/* main */}
      <div className="min-w-0 p-4">
        {/* child header */}
        <div className="flex items-center gap-2.5 pb-3">
          <span className="size-9 shrink-0 overflow-hidden rounded-full border-[1.5px] border-[#ede4d3]/20">
            <ChildAvatar className="size-full" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[13.5px] font-semibold">{p.child.name}</p>
            <p className="text-[10px] text-[#857b69]">{p.child.meta}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#6b7a5e]/25 px-2 py-1 text-[9px] font-semibold text-[#bcc9a6]">
            <span className="size-1 rounded-full bg-[#93b065]" />
            {p.child.status}
          </span>
        </div>

        {/* progress overview */}
        <div className="rounded-[10px] border border-white/[0.08] bg-[#29241d] p-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-[12px] font-medium">Progress Overview</h4>
            <span className="text-[9.5px] text-[#b0693c]">View details →</span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {(
              [
                { label: "Communication", d: p.communication },
                { label: "Social", d: p.social },
              ] as const
            ).map(({ label, d }) => (
              <div key={label}>
                <p className="text-[9.5px] text-[#857b69]">{label}</p>
                <p className="mt-0.5 flex items-baseline gap-1 font-serif text-[18px] font-semibold">
                  {d.value}% <span className="text-[10px] text-[#93b065]">↗</span>
                </p>
                <DashBar pct={d.value} />
                <p className="mt-1.5 text-[9px] leading-snug text-[#b3a893]">{d.note}</p>
                <p className="mt-1 text-[8.5px] text-[#857b69]">
                  Last month <b className="font-semibold text-[#b3a893]">{d.lastMonth}%</b>
                  &nbsp;&nbsp;This month <b className="font-semibold text-[#b3a893]">{d.value}%</b>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* progress over time */}
        <div className="mt-2.5 rounded-[10px] border border-white/[0.08] bg-[#29241d] p-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-[12px] font-medium">Progress Over Time</h4>
            <span className="flex gap-2.5 text-[8px] text-[#b3a893]">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#93b065]" />Communication
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#cf8a4a]" />Social
              </span>
            </span>
          </div>
          <div className="relative mt-2 h-[76px]">
            <span className="absolute top-0 left-0 text-[8px] text-[#857b69]">100%</span>
            <span className="absolute top-[30px] left-0 text-[8px] text-[#857b69]">50%</span>
            <span className="absolute top-[60px] left-0 text-[8px] text-[#857b69]">0%</span>
            <svg
              viewBox="0 0 200 76"
              preserveAspectRatio="none"
              className="absolute inset-y-0 right-0 left-6 h-full w-[calc(100%-1.5rem)] overflow-visible"
            >
              <polyline
                points={line(p.trend.communication)}
                fill="none"
                stroke="#93b065"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={line(p.trend.social)}
                fill="none"
                stroke="#cf8a4a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="mt-1 flex justify-between pl-6 text-[8px] text-[#857b69]">
            {p.trend.months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        {/* mini stats */}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[9px] border border-white/[0.08] bg-[#29241d] px-2.5 py-2.5">
            <p className="text-[9px] text-[#857b69]">Goal progress</p>
            <p className="my-0.5 font-serif text-[16px] font-semibold">
              {p.goal.done} / {p.goal.total}
            </p>
            <DashBar pct={(p.goal.done / p.goal.total) * 100} />
          </div>
          <div className="rounded-[9px] border border-white/[0.08] bg-[#29241d] px-2.5 py-2.5">
            <p className="text-[9px] text-[#857b69]">Attendance</p>
            <p className="my-0.5 font-serif text-[16px] font-semibold">{p.attendance}%</p>
            <DashBar pct={p.attendance} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* floating cards                                                             */
/* -------------------------------------------------------------------------- */

function FloatHead({
  icon: I,
  label,
  dark,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold">
        <I size={13} stroke={1.9} className={dark ? "text-[#bcc9a6]" : "text-terracotta"} />
        {label}
      </span>
      <IconArrowRight size={12} stroke={2} className={dark ? "text-[#e8ecdb]/45" : "text-charcoal/40"} />
    </div>
  );
}

function Float({
  className,
  dark,
  children,
}: {
  className: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[15px] border p-[18px] shadow-[0_2px_4px_rgba(30,22,15,0.09),0_32px_58px_-26px_rgba(30,22,15,0.4)]",
        dark
          ? "border-white/5 bg-[#363f2b] text-[#e8ecdb]"
          : "border-charcoal/[0.06] bg-canvas-white text-charcoal",
        className
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function DashboardPreview() {
  const p = PROGRESS_PREVIEW;

  return (
    <section className="bg-ivory px-6 py-16 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Illustrative-only mock of the parent dashboard -- not a live
            screenshot, see src/content/marketing/dashboard-preview.ts. */}
        <div className="relative lg:min-h-[720px]">
          {/* pitch */}
          <div className="lg:absolute lg:top-1 lg:left-[3%] lg:w-[27%]">
            <div className="flex items-center gap-3.5">
              <span className="text-[11px] font-semibold tracking-[0.17em] whitespace-nowrap text-rust-dark uppercase">
                Progress &amp; Support
              </span>
              <span aria-hidden className="h-px flex-1 bg-rust-light/60" />
            </div>
            <h2 className="mt-5 font-serif text-[1.7rem] leading-[1.03] tracking-tight text-charcoal sm:text-[2.4rem] lg:text-[3rem]">
              A clearer view of
              <span className="block text-terracotta">your child&apos;s care.</span>
            </h2>
            <p className="mt-5 max-w-[22em] text-sm leading-relaxed text-ink-soft sm:text-[14.5px]">
              Progress, sessions, reports and therapist updates, all in one calm place.
            </p>
            <Link
              href="/parent"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-rust-dark"
            >
              Explore the parent dashboard
              <IconArrowRight size={14} stroke={2.2} />
            </Link>
          </div>

          {/* dashboard */}
          <div className="relative mt-10 lg:absolute lg:top-[34px] lg:left-[35%] lg:mt-0 lg:w-[47%]">
            <span
              aria-hidden
              className="absolute -right-6 -bottom-6 -z-10 hidden h-[88%] w-[78%] rounded-[22px] bg-[#e0cdb4] lg:block"
            />
            <span aria-hidden className="absolute -top-2 -right-7 hidden h-[146px] w-[92px] lg:block">
              <svg viewBox="0 0 96 150" fill="none" className="size-full">
                <path
                  d="M52 150C40 110 30 70 44 30 58 -6 92 4 92 4s-6 46-22 74c-10 18-18 40-18 72Z"
                  fill="#6f8154"
                />
                <path d="M60 120C56 92 58 60 78 34c-6 30-10 56-18 86Z" fill="#5a6a46" />
                <path
                  d="M40 150C34 116 22 84 4 66c10 34 22 54 36 84Z"
                  fill="#7d8f60"
                  opacity="0.9"
                />
              </svg>
            </span>
            <Dashboard />
          </div>

          {/* floating cards -- stacked on mobile, absolute on lg */}
          <div className="mt-4 flex flex-col gap-3 lg:mt-0 lg:contents">
            {/* Communication (left) */}
            <Float className="lg:absolute lg:top-[238px] lg:left-[24.5%] lg:w-[20.5%]">
              <FloatHead icon={IconMessageCircle} label="Communication" />
              <p className="mt-3 flex items-baseline gap-1.5 font-serif text-[26px] font-semibold">
                {p.communication.value}% <span className="text-[13px] text-success">↗</span>
              </p>
              <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-charcoal/[0.09]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7f9560] to-[#a0b47c]"
                  style={{ width: `${p.communication.value}%` }}
                />
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">{p.communication.note}</p>
              <div className="mt-3 flex gap-1.5 rounded-[9px] bg-[#eee5d4] px-2.5 py-2.5 text-[10px] leading-snug text-ink-soft">
                <IconBulb size={12} stroke={1.8} className="mt-px shrink-0 text-terracotta" />
                {p.communication.highlight}
              </div>
              <p className="mt-3 text-[9px] text-charcoal/45">
                Last month <b className="font-semibold text-ink-soft">{p.communication.lastMonth}%</b>
                &nbsp;&nbsp;This month <b className="font-semibold text-ink-soft">{p.communication.value}%</b>
              </p>
            </Float>

            {/* Next session (right, top) */}
            <Float className="lg:absolute lg:top-[52px] lg:right-[10%] lg:w-[16.8%]">
              <FloatHead icon={IconCalendarEvent} label="Next session" />
              <p className="mt-3.5 font-serif text-[14px] font-semibold">{p.nextSession.label}</p>
              <p className="mt-1 text-[10.5px] text-ink-soft">{p.nextSession.time}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#eee5d4] px-2.5 py-1 text-[9.5px] text-ink-soft">
                <IconVideo size={10} stroke={1.9} />
                {p.nextSession.mode}
              </span>
              <div className="mt-4 flex items-center gap-2.5 border-t border-charcoal/[0.07] pt-3.5">
                <span className="size-[30px] shrink-0 rounded-full bg-gradient-to-br from-terracotta to-[#8b9a6b]" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[11px] font-semibold">
                    {p.nextSession.therapist}
                    <IconRosetteDiscountCheckFilled size={11} className="shrink-0 text-success" />
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-charcoal/45">{p.nextSession.therapistRole}</p>
                </div>
              </div>
            </Float>

            {/* Latest therapist note (right, mid) */}
            <Float dark className="lg:absolute lg:top-[258px] lg:right-[11.5%] lg:w-[16%]">
              <FloatHead icon={IconFileText} label="Latest therapist note" dark />
              <p className="mt-3.5 text-[11.5px] leading-relaxed">&ldquo;{p.note.quote}&rdquo;</p>
              <p className="mt-3 text-[9px] text-[#e8ecdb]/55">
                {p.note.author} · {p.note.date}
              </p>
            </Float>

            {/* Recent report (right, bottom) */}
            <Float className="lg:absolute lg:top-[450px] lg:right-[10%] lg:w-[16.8%]">
              <FloatHead icon={IconFileText} label="Recent report" />
              <div className="mt-3.5 flex items-start justify-between gap-2.5">
                <div>
                  <p className="text-[12px] font-semibold">{p.report.label}</p>
                  <p className="mt-0.5 text-[9.5px] text-charcoal/45">{p.report.meta}</p>
                  <span className="mt-2 inline-block rounded-[5px] bg-terracotta/[0.13] px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.04em] text-rust-dark">
                    New
                  </span>
                </div>
                <span className="grid h-[42px] w-8 shrink-0 place-items-center rounded border border-charcoal/[0.07] bg-[#eee5d4] text-charcoal/40">
                  <IconFileText size={15} stroke={1.7} />
                </span>
              </div>
            </Float>
          </div>
        </div>

        {/* the three supports */}
        <div className="mt-16 grid gap-10 sm:grid-cols-3 lg:mt-8">
          {SUPPORT_POINTS.map((point) => (
            <div key={point.title}>
              <span className="grid size-11 place-items-center rounded-full bg-terracotta/12 text-terracotta">
                <Icon icon={point.icon} size="md" />
              </span>
              <h3 className="mt-4 font-serif text-lg text-charcoal">{point.title}</h3>
              <p className="mt-1.5 max-w-[26em] text-[13px] leading-relaxed text-ink-soft">{point.body}</p>
            </div>
          ))}
        </div>

        {/* closer */}
        <div className="mt-14 flex items-center gap-4">
          <span aria-hidden className="h-px flex-1 bg-rust-light/45" />
          <span className="text-center text-[10.5px] font-semibold tracking-[0.14em] text-rust-dark uppercase sm:whitespace-nowrap">
            Less searching. Less guessing. More confidence in their care.
          </span>
          <span aria-hidden className="h-px flex-1 bg-rust-light/45" />
        </div>
      </div>
    </section>
  );
}
