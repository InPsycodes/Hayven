import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconRosetteDiscountCheckFilled,
  IconShieldCheck,
  IconSparkles,
  IconVideo,
} from "@tabler/icons-react";

import { PRICING_POINTS } from "@/content/marketing/pricing";
import { Icon } from "@/components/ui/icon";

/**
 * "Spotlight" pricing band: a warm near-black section that shows the promise
 * rather than just stating it -- a sample therapist profile card with the
 * session rate as its centrepiece, beside the three points.
 *
 * The card is illustrative only (same posture as the homepage dashboard
 * mock, see src/content/marketing/dashboard-preview.ts). The rate itself is
 * deliberately shown as a redacted placeholder: there is no real pricing
 * data on the platform to cite, and every therapist sets their own (see the
 * note in src/content/marketing/pricing.ts).
 */
export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative isolate overflow-hidden bg-[#181410] px-6 py-20 text-canvas-white sm:py-24 lg:px-10 lg:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[32%] -right-[12%] -z-10 size-[760px] rounded-full bg-[radial-gradient(circle,rgba(184,115,76,0.30)_0%,rgba(184,115,76,0.09)_36%,transparent_68%)]"
      />

      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.03fr)] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-8">
        {/* pitch */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="flex items-center gap-3">
            <span className="eyebrow text-rust-light">Pricing</span>
            <span aria-hidden className="h-px w-8 bg-rust-light/50" />
          </div>
          <h2 className="mt-4 font-serif text-[1.5rem] leading-tight tracking-tight text-canvas-white [text-wrap:balance] sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
            You see the price <em className="not-italic text-rust-light">before</em> you commit.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-canvas-white/70 sm:text-[15px]">
            No quotes, no back-and-forth. Every therapist sets their own session rate, and it&apos;s
            right there on their profile.
          </p>
        </div>

        {/* sample "credential card" -- illustrative only, redacted rate */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div className="mx-auto max-w-[380px] overflow-hidden rounded-[22px] border border-black/5 bg-canvas-white text-charcoal shadow-[0_2px_4px_rgba(0,0,0,0.22),0_46px_80px_-34px_rgba(0,0,0,0.62)]">
            <div className="flex items-center justify-between bg-gradient-to-r from-terracotta to-rust-dark px-[18px] py-3 text-white">
              <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase">
                <span aria-hidden className="size-2 rounded-[2px] bg-white/90" />
                Hayven
              </span>
              <span className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-[0.08em] uppercase opacity-90">
                <IconCheck size={11} stroke={3.2} />
                Verified therapist
              </span>
            </div>

            <div className="flex flex-col items-center px-6 pt-6 pb-5 text-center">
              <span className="grid size-[118px] place-items-center rounded-[20px] border border-white/50 bg-gradient-to-br from-[#cdd3bd] via-[#9aac82] to-[#6b7a5e] text-[#33402a] shadow-[0_10px_24px_-12px_rgba(28,24,19,0.4)]">
                <svg
                  viewBox="0 0 56 56"
                  className="size-[60px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M16 31c-3-2-4-7-3-12C15 10 21 6 28 6s13 4 15 13c1 5 0 10-3 12" />
                  <path d="M18 23c0 7 4 13 10 13s10-6 10-13" />
                  <path d="M16 19v13M40 19v13" />
                  <path d="M11 50c1-8 8-13 17-13s16 5 17 13" />
                </svg>
              </span>
              <p className="mt-4 flex items-center gap-1.5 font-serif text-[1.24rem] font-semibold text-charcoal">
                Dr. Adaeze Okwu
                <IconRosetteDiscountCheckFilled size={17} className="shrink-0 text-success" />
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Speech &amp; Language Therapist · 8 yrs
              </p>
            </div>

            <div className="px-6 pt-1 pb-6">
              <div
                aria-hidden
                className="mb-4 h-px bg-[repeating-linear-gradient(90deg,rgba(28,24,19,0.12)_0_4px,transparent_4px_8px)]"
              />

              <div className="flex gap-3 py-2.5">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-success/15 text-success-text">
                  <IconSparkles size={16} stroke={1.9} />
                </span>
                <div>
                  <p className="text-[9.5px] font-bold tracking-[0.1em] text-charcoal/50 uppercase">
                    Focus areas
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">
                    Speech &amp; language, ABA, early intervention
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-charcoal/[0.07] py-2.5">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-success/15 text-success-text">
                  <IconVideo size={16} stroke={1.9} />
                </span>
                <div>
                  <p className="text-[9.5px] font-bold tracking-[0.1em] text-charcoal/50 uppercase">
                    Sessions
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">Video · Home visits · Lagos</p>
                </div>
              </div>

              <div className="mt-3.5 rounded-[14px] border border-terracotta/15 bg-terracotta/[0.07] px-[15px] py-3.5">
                <p className="text-[9.5px] font-bold tracking-[0.11em] text-rust-dark uppercase">
                  Session rate
                </p>
                <p className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-serif text-[1.7rem] font-semibold text-charcoal">₦</span>
                  <span
                    aria-hidden
                    className="inline-block h-[15px] w-[84px] rounded-[3px] bg-[repeating-linear-gradient(90deg,rgba(28,24,19,0.17)_0_5px,transparent_5px_9px)]"
                  />
                  <span className="sr-only">rate set by the therapist, shown on their profile</span>
                  <span className="text-[12px] text-ink-soft">/ 50-min session</span>
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                  <IconShieldCheck size={13} stroke={2} className="shrink-0 text-success" />
                  What you see is what you pay. No platform fee.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3.5 text-center text-[11px] text-canvas-white/45 lg:text-left">
            A sample profile. Every therapist sets and shows their own rate.
          </p>
        </div>

        {/* the three points + link */}
        <div className="lg:col-start-1 lg:row-start-2">
          <ul className="flex flex-col">
            {PRICING_POINTS.map((point) => (
              <li
                key={point.title}
                className="grid grid-cols-[auto_1fr] gap-3.5 border-t border-white/12 py-4 last:border-b last:border-white/12"
              >
                <Icon
                  icon={point.icon}
                  size="sm"
                  className="mt-0.5 shrink-0 text-rust-light"
                />
                <div>
                  <p className="font-serif text-[15px] text-canvas-white">{point.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-canvas-white/55">
                    {point.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/search"
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-3 text-[13px] font-semibold text-canvas-white transition-colors hover:bg-rust-dark"
          >
            Browse verified therapists
            <IconArrowRight
              size={15}
              stroke={2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
