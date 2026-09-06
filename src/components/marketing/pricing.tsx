import { PRICING_POINTS } from "@/content/marketing/pricing";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/marketing/reveal";

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-16 sm:py-20 lg:px-10 lg:pt-36 lg:pb-16">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Pricing</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            You see the price before you commit.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            No quotes, no back-and-forth. Every therapist sets their own session rate, and it&apos;s
            right there on their profile.
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:mt-14 sm:grid-cols-3 sm:gap-10">
          {PRICING_POINTS.map((point, index) => (
            <Reveal key={point.title} delayMs={index * 60}>
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-terracotta/25 bg-terracotta/12 text-terracotta">
                  <Icon icon={point.icon} size="md" />
                </span>
                <h3 className="font-serif text-lg text-charcoal">{point.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-ink-soft">{point.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
