import Link from "next/link";

import { SPECIALTY_CARDS } from "@/content/marketing/specialties";
import { Icon } from "@/components/ui/icon";

// No real specialty photography exists yet -- each card gets a distinct
// brand-toned gradient in place of a photo, sized/positioned identically so
// swapping in real photos later is a one-line change per card.
const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #9c5934 0%, #dcd3be 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #9c5934 100%)",
  "linear-gradient(135deg, #b8734c 0%, #4a4744 100%)",
  "linear-gradient(135deg, #6b7a5e 0%, #dcd3be 100%)",
];

export function Specialties() {
  return (
    <section id="specialties" className="px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <span className="eyebrow text-terracotta">Find the right therapist</span>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-charcoal lg:text-[2.75rem]">
          A diverse team, matched to your child&apos;s needs.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          Every specialist on Hayven is admin-verified before their profile goes live, across the
          therapy types families ask for most.
        </p>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIALTY_CARDS.map((card, index) => (
            <div
              key={card.title}
              className="group overflow-hidden rounded-2xl border border-charcoal/8 bg-canvas-white transition-all hover:-translate-y-1 hover:border-terracotta/40"
            >
              <div className="aspect-4/3 overflow-hidden">
                <div
                  className="size-full transition-transform duration-500 group-hover:scale-105"
                  style={{ background: PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length] }}
                />
              </div>
              <div className="p-6">
                <div className="relative -mt-11 flex size-10 items-center justify-center rounded-xl border border-charcoal/8 bg-canvas-white text-terracotta">
                  <Icon icon={card.icon} size="md" />
                </div>
                <h3 className="mt-4 font-serif text-xl text-charcoal">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/search"
          className="mt-10 inline-block border-b-2 border-terracotta pb-1 text-sm font-medium text-charcoal transition-colors hover:text-terracotta"
        >
          Browse verified therapists
        </Link>
      </div>
    </section>
  );
}
