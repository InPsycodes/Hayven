import { TRUST_ITEMS } from "@/content/marketing/trust";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/marketing/reveal";

export function TrustStrip() {
  return (
    <section className="px-6 py-16 lg:px-10 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_ITEMS.map((item, index) => (
          <Reveal key={item.label} delayMs={index * 80}>
            <div className="flex items-center gap-4 rounded-2xl border border-charcoal/8 bg-canvas-white p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-terracotta/12 text-terracotta">
                <Icon icon={item.icon} size="md" />
              </span>
              <span className="text-[15px] font-medium text-charcoal">{item.label}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
