import { TRUST_SAFETY_POINTS } from "@/content/marketing/trust-safety";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/marketing/reveal";

export function TrustSafety() {
  return (
    <section className="px-6 py-16 sm:py-20 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Trust &amp; safety</span>
          <h2 className="mt-3 font-serif text-[1.7rem] leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Care you can trust.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            You&apos;re trusting Hayven with your child&apos;s care and your family&apos;s
            information. Here&apos;s what actually stands behind that trust.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-3">
          {TRUST_SAFETY_POINTS.map((point, index) => (
            <Reveal key={point.title} delayMs={index * 80} className="h-full">
              {/* Title and body are stacked in the same grid cell (both
                  col/row-start-1), so the cell auto-sizes to whichever is
                  taller at any card width -- no fixed-height guess needed.
                  The title fades out and the body fades in on hover, so the
                  card's footprint never changes and no sibling card shifts. */}
              <div className="group relative flex h-full scale-100 flex-col items-center gap-4 rounded-[1.25rem] border-[1.5px] border-terracotta/70 bg-canvas-white p-8 text-center shadow-[0_10px_30px_-16px_rgba(26,18,12,0.22),0_0_40px_-16px_rgba(156,89,52,0.25)] transition-all duration-300 ease-out hover:z-20 hover:scale-[1.04] hover:border-terracotta hover:shadow-[0_14px_36px_-16px_rgba(26,18,12,0.26),0_0_48px_-14px_rgba(156,89,52,0.32)]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-terracotta/25 bg-terracotta/12 text-terracotta">
                  <Icon icon={point.icon} size="md" />
                </span>

                <div className="grid justify-items-center">
                  <h3 className="col-start-1 row-start-1 self-start font-serif text-lg text-charcoal transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-0">
                    {point.title}
                  </h3>
                  <p className="col-start-1 row-start-1 translate-y-1 self-start text-sm leading-relaxed text-ink-soft opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    {point.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
