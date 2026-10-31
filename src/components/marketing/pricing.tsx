import Link from "next/link";
import {
  IconArrowRight,
  IconDeviceLaptop,
  IconMapPin,
  IconRosetteDiscountCheckFilled,
  IconShieldCheck,
} from "@tabler/icons-react";

import { PRICING_POINTS } from "@/content/marketing/pricing";
import { Icon } from "@/components/ui/icon";

/**
 * "Spotlight" pricing band. A warm near-black section with a sample therapist
 * "credential card" beside the three points, so the section shows the promise
 * rather than only stating it.
 *
 * The card is illustrative only (same posture as the homepage dashboard mock,
 * see src/content/marketing/dashboard-preview.ts): the portrait is an
 * illustration, not a photo of a real person, and every rate is shown as a
 * redacted placeholder because the platform has no real pricing data to cite
 * and each therapist sets their own. "Hayven platform fee: N0" is a true,
 * already-shipped fact (see src/content/marketing/pricing.ts).
 */
export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative isolate overflow-hidden bg-[#181410] px-6 py-20 text-canvas-white sm:py-24 lg:px-10 lg:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[32%] -right-[14%] -z-10 size-[760px] rounded-full bg-[radial-gradient(circle,rgba(184,115,76,0.30)_0%,rgba(184,115,76,0.09)_36%,transparent_68%)]"
      />

      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:items-center lg:gap-x-16">
        {/* --- left: the pitch --- */}
        <div>
          <h2 className="font-serif text-[1.7rem] leading-[1.06] tracking-tight text-canvas-white sm:text-[2.5rem] lg:text-[3.3rem]">
            You see the price.
            <br />
            <em className="not-italic">Before you commit.</em>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-canvas-white/65 sm:text-[15px]">
            No quotes. No back-and-forth. Every therapist sets their own rate, and you&apos;ll
            see it before you book.
          </p>

          <ol className="mt-9 flex flex-col gap-7">
            {PRICING_POINTS.map((point, i) => (
              <li
                key={point.title}
                className="relative grid grid-cols-[1.25rem_2.5rem_1fr] items-start gap-x-4"
              >
                {i < PRICING_POINTS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-10 left-[3.5rem] h-7 w-px bg-white/12"
                  />
                )}
                <span className="pt-2.5 font-serif text-[13px] text-rust-light tabular-nums">
                  0{i + 1}
                </span>
                <span className="grid size-10 place-items-center rounded-full border border-rust-light/35 text-rust-light">
                  <Icon icon={point.icon} size="md" />
                </span>
                <div className="pt-1">
                  <p className="font-serif text-[15px] font-medium text-canvas-white">{point.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-canvas-white/55">{point.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex items-center gap-3.5 border-t border-white/12 pt-6">
            <IconShieldCheck size={20} stroke={1.6} className="shrink-0 text-rust-light" />
            <p className="text-[12.5px] leading-relaxed">
              <span className="font-semibold text-rust-light">
                The rate you see is the rate you pay.
              </span>{" "}
              <span className="text-canvas-white/45">No surprise fees. No negotiation. No guessing.</span>
            </p>
          </div>
        </div>

        {/* --- right: sample credential card --- */}
        <div className="relative justify-self-center lg:justify-self-end">
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-[30px] border border-white/[0.06] bg-white/[0.03] sm:-inset-6"
          />

          <div className="w-full max-w-[420px] overflow-hidden rounded-[20px] bg-[#e5ddc9] text-charcoal shadow-[0_2px_4px_rgba(0,0,0,0.22),0_50px_90px_-36px_rgba(0,0,0,0.65)]">
            {/* header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-terracotta to-rust-dark px-5 py-3.5 text-white">
              <span className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em]">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
                  <path d="M12 2c1.8 2.8 1.8 5.7 0 8.5-1.8-2.8-1.8-5.7 0-8.5Zm0 20c-1.8-2.8-1.8-5.7 0-8.5 1.8 2.8 1.8 5.7 0 8.5ZM2 12c2.8-1.8 5.7-1.8 8.5 0-2.8 1.8-5.7 1.8-8.5 0Zm20 0c-2.8 1.8-5.7 1.8-8.5 0 2.8-1.8 5.7-1.8 8.5 0Z" />
                </svg>
                HAYVEN
              </span>
              <span className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-[0.09em]">
                <IconShieldCheck size={13} stroke={2.2} />
                VERIFIED THERAPIST
              </span>
            </div>

            <div className="px-5 pt-5">
              <div className="flex gap-4">
                <span className="grid size-[86px] shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-br from-[#cdd3bd] to-[#96a87e]">
                  <svg viewBox="0 0 96 96" className="size-full" fill="none" aria-hidden>
                    <path d="M24 96c2-16 12-25 24-25s22 9 24 25Z" fill="#b06a3c" />
                    <rect x="43" y="52" width="10" height="16" rx="3" fill="#e6b98c" />
                    <ellipse cx="48" cy="41" rx="16" ry="17.5" fill="#eecfa6" />
                    <path
                      d="M31 44c-2-16 6-26 17-26s19 10 17 26c-2-6-4-10-8-10-3 0-4 2-9 2s-6-2-9-2c-4 0-6 4-8 10Z"
                      fill="#2e221c"
                    />
                  </svg>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="flex items-center gap-1.5 font-serif text-[16.5px] font-semibold leading-tight">
                    Dr. Adaeze Okwu
                    <IconRosetteDiscountCheckFilled size={15} className="shrink-0 text-success" />
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Speech &amp; Language Therapist · 8 yrs
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Speech", "ABA", "Early intervention"].map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-charcoal/10 bg-charcoal/5 px-2 py-0.5 text-[10.5px] font-medium text-ink-soft"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
                <span className="flex items-center gap-1">
                  <IconMapPin size={12} stroke={1.9} className="text-charcoal/40" />
                  Lagos, Nigeria
                </span>
                <span className="flex items-center gap-1">
                  <IconDeviceLaptop size={12} stroke={1.9} className="text-charcoal/40" />
                  Online &amp; in-person
                </span>
              </div>
            </div>

            {/* rate */}
            <div className="mt-4 border-t border-charcoal/10 px-5 pt-4">
              <p className="text-[9.5px] font-bold tracking-[0.13em] text-rust-dark uppercase">
                Session rate
              </p>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-[1.7rem] font-semibold">₦</span>
                <span
                  aria-hidden
                  className="inline-block h-[17px] w-[86px] rounded-[3px] bg-[repeating-linear-gradient(90deg,rgba(28,24,19,0.18)_0_5px,transparent_5px_9px)]"
                />
                <span className="sr-only">rate set by the therapist, shown on their profile</span>
                <span className="text-[11.5px] text-ink-soft">/ 50-min session</span>
              </p>

              <div className="mt-3 rounded-xl border border-charcoal/[0.06] bg-[#dbd1ba] p-3.5">
                <p className="text-[9px] font-bold tracking-[0.13em] text-rust-dark uppercase">
                  Price breakdown
                </p>
                <div className="mt-2.5 flex flex-col gap-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-soft">Therapist&apos;s rate</span>
                    <span className="flex items-baseline gap-1 text-charcoal">
                      ₦
                      <span
                        aria-hidden
                        className="inline-block h-[9px] w-[42px] rounded-[2px] bg-[repeating-linear-gradient(90deg,rgba(28,24,19,0.2)_0_4px,transparent_4px_7px)]"
                      />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-soft">Hayven platform fee</span>
                    <span className="font-medium text-success-text">₦0</span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-charcoal/10 pt-2.5">
                  <span className="text-[13px] font-semibold">You pay</span>
                  <span className="flex items-baseline gap-1 text-[13px] font-semibold text-charcoal">
                    ₦
                    <span
                      aria-hidden
                      className="inline-block h-[10px] w-[46px] rounded-[2px] bg-[repeating-linear-gradient(90deg,rgba(28,24,19,0.2)_0_4px,transparent_4px_7px)]"
                    />
                  </span>
                </div>
                <p className="mt-1.5 text-[10.5px] text-charcoal/45">What you see is what you pay.</p>
              </div>
            </div>

            {/* CTA */}
            <div className="p-5 pt-4">
              <Link
                href="/search"
                className="group flex items-center justify-center gap-2 rounded-full bg-terracotta-fill py-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-rust-dark"
              >
                Find a therapist
                <IconArrowRight
                  size={14}
                  stroke={2.2}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
