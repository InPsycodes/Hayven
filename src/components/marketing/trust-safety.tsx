import { TRUST_SAFETY_POINTS } from "@/content/marketing/trust-safety";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/marketing/reveal";

export function TrustSafety() {
  return (
    <section className="px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Trust &amp; safety</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Care you can trust.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            You&apos;re trusting Hayven with your child&apos;s care and your family&apos;s
            information. Here&apos;s what actually stands behind that trust.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {TRUST_SAFETY_POINTS.map((point, index) => (
            <Reveal key={point.title} delayMs={index * 80} className="h-full">
              <div className="flex h-full scale-100 flex-col gap-4 rounded-[1.25rem] border-[1.5px] border-terracotta/70 bg-canvas-white p-8 shadow-[0_20px_60px_-15px_rgba(26,18,12,0.3),0_0_70px_-8px_rgba(156,89,52,0.45)] transition-all duration-300 ease-out hover:scale-[1.04] hover:border-terracotta hover:shadow-[0_24px_64px_-14px_rgba(26,18,12,0.32),0_0_80px_-6px_rgba(156,89,52,0.55)]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-terracotta/25 bg-terracotta/12 text-terracotta">
                  <Icon icon={point.icon} size="md" />
                </span>
                <div>
                  <h3 className="font-serif text-lg text-charcoal">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
