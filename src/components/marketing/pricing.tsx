import Link from "next/link";
import {
  IconArrowRight,
  IconRosetteDiscountCheckFilled,
  IconShieldCheck,
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

        {/* sample profile card */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div className="rounded-3xl border border-black/5 bg-canvas-white p-6 text-charcoal shadow-[0_2px_4px_rgba(0,0,0,0.18),0_40px_72px_-34px_rgba(0,0,0,0.55)] sm:p-7">
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-terracotta to-[#6b7a5e] font-serif text-base font-semibold text-white">
                AO
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-serif text-[15px] font-semibold text-charcoal">
                  Dr. Adaeze Okwu
                  <IconRosetteDiscountCheckFilled size={15} className="shrink-0 text-success" />
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Speech &amp; Language Therapist · Lagos
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-terracotta/20 bg-terracotta/10 px-2.5 py-1 text-[11px] font-medium text-rust-dark">
                Speech &amp; language
              </span>
              <span className="rounded-full border border-terracotta/20 bg-terracotta/10 px-2.5 py-1 text-[11px] font-medium text-rust-dark">
                ABA
              </span>
              <span className="rounded-full border border-charcoal/10 bg-charcoal/5 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                Video
              </span>
              <span className="rounded-full border border-charcoal/10 bg-charcoal/5 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                Home visits
              </span>
            </div>

            <div className="mt-5 border-t border-dashed border-charcoal/15 pt-4">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Session rate
              </p>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-[1.9rem] font-semibold tracking-tight text-charcoal">
                  ₦
                </span>
                <span
                  aria-hidden
                  className="inline-block h-5 w-24 rounded bg-[repeating-linear-gradient(90deg,rgba(26,26,26,0.16)_0_5px,transparent_5px_9px)]"
                />
                <span className="sr-only">rate set by the therapist, shown on their profile</span>
                <span className="text-[13px] text-ink-soft">/ 50-min session</span>
              </p>
              <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-soft">
                <IconShieldCheck size={14} stroke={1.75} className="shrink-0 text-success" />
                What you see is what you pay. No platform fee.
              </p>
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
