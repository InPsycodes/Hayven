import { TRUST_ITEMS } from "@/content/marketing/trust";
import { Icon } from "@/components/ui/icon";

export function TrustStrip() {
  return (
    <section className="border-y border-charcoal/8 px-6 py-10 lg:px-10 lg:py-12">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:justify-between">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <Icon icon={item.icon} size="sm" className="shrink-0 text-terracotta" />
            <span className="text-sm font-medium text-ink-soft">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
