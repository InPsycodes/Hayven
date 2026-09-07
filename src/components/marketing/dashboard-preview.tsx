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

/** 0-100 series -> points on the chart's 200x120 viewBox. */
function line(values: number[]): string {
  const n = values.length;
  return values.map((v, i) => `${(i / (n - 1)) * 200},${120 - (v / 100) * 120}`).join(" ");
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

function TherapistAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <rect width="40" height="40" fill="#a07a52" />
      <circle cx="14" cy="14" r="6" fill="#2e2419" />
      <circle cx="26" cy="14" r="6" fill="#2e2419" />
      <path d="M11 20c0-6 4-10 9-10s9 4 9 10" fill="#2e2419" />
      <circle cx="20" cy="22" r="8" fill="#7a5238" />
      <path d="M10 40c0-6 4.5-10 10-10s10 4 10 10Z" fill="#3a4a30" />
    </svg>
  );
}

function DashBar({ pct }: { pct: number }) {
  return (
    <div className="mt-[9px] h-1 overflow-hidden rounded-[3px] bg-[#ede4d3]/12">
      <div
        className="h-full rounded-[3px] bg-gradient-to-r from-[#7f9560] to-[#a0b47c]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const Leaf = (
  <svg viewBox="0 0 96 150" fill="none" className="size-full">
    <path
      d="M52 150C40 110 30 70 44 30 58 -6 92 4 92 4s-6 46-22 74c-10 18-18 40-18 72Z"
      fill="#6f8154"
    />
    <path d="M60 120C56 92 58 60 78 34c-6 30-10 56-18 86Z" fill="#5a6a46" />
    <path d="M40 150C34 116 22 84 4 66c10 34 22 54 36 84Z" fill="#7d8f60" opacity="0.9" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* dark dashboard mock                                                        */
/* -------------------------------------------------------------------------- */

function Dashboard() {
  const p = PROGRESS_PREVIEW;
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-black/40 bg-[#1c1813] text-[#ede4d3] shadow-[0_2px_6px_rgba(0,0,0,0.26),0_46px_84px_-38px_rgba(30,22,15,0.5)] sm:grid-cols-[132px_1fr] lg:min-h-[620px]">
      {/* sidebar */}
      <nav className="flex gap-1 overflow-x-auto border-b border-white/[0.09] p-[11px] sm:flex-col sm:gap-[3px] sm:overflow-visible sm:border-r sm:border-b-0 sm:px-[11px] sm:py-[15px]">
        <span className="hidden items-center gap-1.5 px-[7px] pt-1 pb-[13px] text-[9.5px] font-bold tracking-[0.12em] sm:flex">
          <HayvenMark className="size-3 text-[#b0693c]" />
          HAYVEN
        </span>
        {DASHBOARD_NAV.map((label, i) => {
          const I = NAV_ICON[label];
          return (
            <span
              key={label}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-[7px] px-2 py-[7px] text-[10.5px]",
                i === 0 ? "bg-[#b0693c]/[0.18] font-medium text-[#ede4d3]" : "text-[#b3a893]"
              )}
            >
              {I ? <I size={12} stroke={1.8} /> : null}
              {label}
            </span>
          );
        })}
      </nav>

      {/* main */}
      <div className="flex min-w-0 flex-col p-[18px]">
        <div className="flex items-center gap-[11px] pb-4">
          <span className="size-[42px] shrink-0 overflow-hidden rounded-full border-2 border-[#ede4d3]/20">
            <ChildAvatar className="size-full" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[15px] font-semibold">{p.child.name}</p>
            <p className="text-[11px] text-[#857b69]">{p.child.meta}</p>
          </div>
          <span className="flex items-center gap-[5px] rounded-full bg-[#6b7a5e]/25 px-[9px] py-1 text-[10px] font-semibold text-[#bcc9a6]">
            <span className="size-[5px] rounded-full bg-[#93b065]" />
            {p.child.status}
          </span>
        </div>

        {/* progress overview */}
        <div className="rounded-[12px] border border-white/[0.09] bg-[#29241d] p-[15px]">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-[13px] font-medium">Progress Overview</h4>
            <span className="text-[10px] text-[#b0693c]">View details →</span>
          </div>
          <div className="mt-[14px] grid grid-cols-1 gap-x-5 gap-y-[6px] sm:grid-cols-2">
            {(
              [
                { label: "Communication", d: p.communication },
                { label: "Social", d: p.social },
              ] as const
            ).map(({ label, d }) => (
              <div key={label}>
                <p className="text-[10.5px] text-[#857b69]">{label}</p>
                <p className="mt-[3px] flex items-baseline gap-1 font-serif text-[24px] font-semibold">
                  {d.value}% <span className="text-[12px] text-[#93b065]">↗</span>
                </p>
                <DashBar pct={d.value} />
                <p className="mt-[9px] text-[10px] leading-[1.45] text-[#b3a893]">{d.note}</p>
                <p className="mt-2 text-[9px] text-[#857b69]">
                  Last month <b className="font-semibold text-[#b3a893]">{d.lastMonth}%</b>
                  &nbsp;&nbsp;This month <b className="font-semibold text-[#b3a893]">{d.value}%</b>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* progress over time */}
        <div className="mt-[13px] rounded-[12px] border border-white/[0.09] bg-[#29241d] p-[15px]">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-[13px] font-medium">Progress Over Time</h4>
            <span className="flex gap-3 text-[9px] text-[#b3a893]">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#93b065]" />Communication
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#cf8a4a]" />Social
              </span>
            </span>
          </div>
          <div className="relative mt-3 h-[120px]">
            <span className="absolute top-0 left-0 text-[9px] text-[#857b69]">100%</span>
            <span className="absolute top-[50px] left-0 text-[9px] text-[#857b69]">50%</span>
            <span className="absolute top-[100px] left-0 text-[9px] text-[#857b69]">0%</span>
            <svg
              viewBox="0 0 200 120"
              preserveAspectRatio="none"
              className="absolute inset-y-[2px] right-[2px] left-7 h-[calc(100%-17px)] w-[calc(100%-30px)] overflow-visible"
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
            <div className="absolute right-[2px] bottom-0 left-7 flex justify-between text-[9px] text-[#857b69]">
              {p.trend.months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* mini stats */}
        <div className="mt-[13px] grid grid-cols-2 gap-3">
          <div className="rounded-[10px] border border-white/[0.09] bg-[#29241d] p-[13px]">
            <p className="text-[10px] text-[#857b69]">Goal progress</p>
            <p className="my-1 font-serif text-[20px] font-semibold">
              {p.goal.done} / {p.goal.total}
            </p>
            <DashBar pct={(p.goal.done / p.goal.total) * 100} />
          </div>
          <div className="rounded-[10px] border border-white/[0.09] bg-[#29241d] p-[13px]">
            <p className="text-[10px] text-[#857b69]">Attendance</p>
            <p className="my-1 font-serif text-[20px] font-semibold">{p.attendance}%</p>
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
      <span className="flex items-center gap-[7px] text-[13px] font-semibold">
        <I size={15} stroke={1.9} className={dark ? "text-[#bcc9a6]" : "text-terracotta"} />
        {label}
      </span>
      <IconArrowRight size={13} stroke={2} className={dark ? "text-[#e8ecdb]/45" : "text-[#8a8072]"} />
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
        "rounded-[16px] border p-[17px] shadow-[0_2px_4px_rgba(30,22,15,0.09),0_34px_62px_-26px_rgba(30,22,15,0.42)] lg:z-30",
        dark
          ? "border-white/5 bg-[#37402c] text-[#e8ecdb]"
          : "border-[#201c16]/[0.07] bg-[#faf7f2] text-[#201c16]",
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
        <div className="relative lg:min-h-[710px]">
          {/* pitch -- left rail */}
          <div className="lg:absolute lg:top-[10px] lg:left-0 lg:w-[31%]">
            <div className="flex items-center gap-3.5">
              <span className="text-[11px] font-semibold tracking-[0.2em] whitespace-nowrap text-rust-dark uppercase">
                Progress &amp; Support
              </span>
              <span aria-hidden className="h-px flex-1 bg-rust-light/70" />
            </div>
            <h2 className="mt-5 font-serif text-[1.7rem] leading-[1.06] tracking-tight text-charcoal sm:text-[2.4rem] lg:text-[2.6rem]">
              A clearer view of
              <span className="block text-terracotta">your child&apos;s care.</span>
            </h2>
            <p className="mt-4 max-w-[21em] text-sm leading-[1.5] text-ink-soft sm:text-[14.5px]">
              Progress, sessions, reports and therapist updates &mdash; all in one calm place.
            </p>
            <Link
              href="/parent"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-terracotta px-[22px] py-[13px] text-[12.5px] font-semibold text-white transition-colors hover:bg-rust-dark"
            >
              Explore the parent dashboard
              <IconArrowRight size={14} stroke={2.2} />
            </Link>
          </div>

          {/* blob -- behind the Communication card */}
          <span
            aria-hidden
            className="hidden lg:absolute lg:top-[400px] lg:left-[16%] lg:z-0 lg:block lg:size-[185px] lg:rounded-full lg:bg-[radial-gradient(circle,rgba(184,115,76,0.32),rgba(184,115,76,0.04)_70%)]"
          />

          {/* leaf -- peeks from behind the dashboard's upper right */}
          <span
            aria-hidden
            className="hidden lg:absolute lg:top-[110px] lg:right-[-8px] lg:z-0 lg:block lg:h-[150px] lg:w-[86px]"
          >
            {Leaf}
          </span>

          {/* dashboard -- wide, reaching the right edge */}
          <div className="relative mt-10 lg:absolute lg:top-[40px] lg:left-[34%] lg:mt-0 lg:w-[66%]">
            <span
              aria-hidden
              className="absolute -right-7 -bottom-6 -z-10 hidden h-[82%] w-[74%] rounded-[22px] bg-[#e2d2bb] lg:block"
            />
            <Dashboard />
          </div>

          {/* floating cards -- stacked on mobile, absolute on lg */}
          <div className="mt-4 flex flex-col gap-3 lg:mt-0 lg:contents">
            {/* Communication (left) */}
            <Float className="lg:absolute lg:top-[320px] lg:left-[24%] lg:w-[21%]">
              <FloatHead icon={IconMessageCircle} label="Communication" />
              <p className="mt-3 flex items-baseline gap-[5px] font-serif text-[29px] font-semibold">
                {p.communication.value}% <span className="text-[14px] text-success">↗</span>
              </p>
              <div className="mt-[9px] h-1.5 overflow-hidden rounded-[3px] bg-[#201c16]/[0.09]">
                <div
                  className="h-full rounded-[3px] bg-gradient-to-r from-[#7f9560] to-[#a0b47c]"
                  style={{ width: `${p.communication.value}%` }}
                />
              </div>
              <p className="mt-[9px] text-[11.5px] leading-[1.45] text-ink-soft">{p.communication.note}</p>
              <div className="mt-[9px] flex gap-2 rounded-[10px] bg-[#ede3d1] px-[11px] py-[9px] text-[11px] leading-[1.4] text-ink-soft italic">
                <IconBulb size={13} stroke={1.8} className="mt-px shrink-0 not-italic text-terracotta" />
                {p.communication.highlight}
              </div>
              <p className="mt-2.5 text-[10px] text-[#8a8072]">
                Last month: <b className="font-semibold text-ink-soft">{p.communication.lastMonth}%</b> · This
                month: <b className="font-semibold text-ink-soft">{p.communication.value}%</b>
              </p>
            </Float>

            {/* Next session (right rail, bottom) */}
            <Float className="lg:absolute lg:top-[350px] lg:left-[87%] lg:w-[20%]">
              <FloatHead icon={IconCalendarEvent} label="Next session" />
              <p className="mt-[15px] font-serif text-[15.5px] font-semibold">{p.nextSession.label}</p>
              <p className="mt-1 text-[11.5px] text-ink-soft">{p.nextSession.time}</p>
              <span className="mt-3 inline-flex items-center gap-[5px] rounded-full bg-[#ede3d1] px-2.5 py-1 text-[10.5px] text-ink-soft">
                <IconVideo size={11} stroke={1.9} />
                {p.nextSession.mode}
              </span>
              <div className="mt-[15px] flex items-center gap-2.5 border-t border-[#201c16]/[0.07] pt-[15px]">
                <span className="size-[34px] shrink-0 overflow-hidden rounded-full">
                  <TherapistAvatar className="size-full" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[12px] font-semibold">
                    {p.nextSession.therapist}
                    <IconRosetteDiscountCheckFilled size={12} className="shrink-0 text-success" />
                  </p>
                  <p className="mt-px text-[10.5px] text-[#8a8072]">{p.nextSession.therapistRole}</p>
                </div>
              </div>
            </Float>

            {/* Latest therapist note (right, mid) */}
            <Float dark className="lg:absolute lg:top-[156px] lg:left-[87%] lg:w-[19%]">
              <FloatHead icon={IconFileText} label="Latest therapist note" dark />
              <p className="mt-[15px] text-[12.5px] leading-[1.6]">&ldquo;{p.note.quote}&rdquo;</p>
              <p className="mt-3.5 text-[10px] text-[#e8ecdb]/55">
                {p.note.author} · {p.note.date}
              </p>
            </Float>

            {/* Recent report (top-right corner of the dashboard) */}
            <Float className="lg:absolute lg:top-[8px] lg:left-[87%] lg:w-[20%]">
              <FloatHead icon={IconFileText} label="Recent report" />
              <div className="mt-[15px] flex items-start justify-between gap-2.5">
                <div>
                  <p className="text-[13px] font-semibold">{p.report.label}</p>
                  <p className="mt-[3px] text-[10.5px] text-[#8a8072]">{p.report.meta}</p>
                  <span className="mt-[9px] inline-block rounded-[5px] bg-terracotta/[0.13] px-[7px] py-[3px] text-[9px] font-bold tracking-[0.04em] text-rust-dark">
                    New
                  </span>
                </div>
                <span className="grid h-[46px] w-[38px] shrink-0 place-items-center rounded-[5px] border border-[#201c16]/[0.07] bg-[#ede3d1] text-[#8a8072]">
                  <IconFileText size={17} stroke={1.7} />
                </span>
              </div>
            </Float>
          </div>
        </div>

        {/* three pillars */}
        <div className="mt-16 grid gap-x-[46px] gap-y-10 sm:grid-cols-3 lg:mt-10 lg:px-[3%]">
          {SUPPORT_POINTS.map((point) => (
            <div key={point.title}>
              <span className="grid size-[46px] place-items-center rounded-full bg-terracotta/12 text-terracotta">
                <Icon icon={point.icon} size="md" />
              </span>
              <h3 className="mt-4 font-serif text-[1.2rem] font-medium text-charcoal">{point.title}</h3>
              <p className="mt-2 max-w-[24em] text-[13.5px] leading-[1.55] text-ink-soft">{point.body}</p>
            </div>
          ))}
        </div>

        {/* closing line */}
        <div className="mt-14 flex items-center justify-center gap-4">
          <span aria-hidden className="h-px w-12 bg-rust-light/50 sm:w-16" />
          <span className="text-center text-[11px] font-semibold tracking-[0.16em] text-rust-dark uppercase sm:whitespace-nowrap">
            Less searching. Less guessing. More confidence in their care.
          </span>
          <span aria-hidden className="h-px w-12 bg-rust-light/50 sm:w-16" />
        </div>
      </div>
    </section>
  );
}
