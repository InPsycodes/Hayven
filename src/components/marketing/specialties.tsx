import Image from "next/image";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { SPECIALTY_CARDS } from "@/content/marketing/specialties";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/marketing/reveal";

// Fallback for cards without real photography yet (see imageSrc on SPECIALTY_CARDS):
// a distinct brand-toned gradient, sized/positioned identically to a photo.
const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #9c5934 0%, #dcd3be 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #9c5934 100%)",
  "linear-gradient(135deg, #b8734c 0%, #4a4744 100%)",
  "linear-gradient(135deg, #6b7a5e 0%, #dcd3be 100%)",
];

export function Specialties() {
  return (
    <section id="specialties" className="px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Find the right therapist</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            A diverse team, matched to your child&apos;s needs.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            Every specialist on Hayven is admin-verified before their profile goes live, across the
            therapy types families ask for most.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIALTY_CARDS.map((card, index) => (
            <Reveal key={card.title} delayMs={index * 80} className="h-full">
              <div className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border-[1.5px] border-terracotta/70 bg-canvas-white shadow-[0_20px_60px_-15px_rgba(26,18,12,0.3),0_0_70px_-8px_rgba(156,89,52,0.45)] transition-all hover:-translate-y-1 hover:border-terracotta hover:shadow-[0_24px_64px_-14px_rgba(26,18,12,0.32),0_0_80px_-6px_rgba(156,89,52,0.55)]">
                <div className="relative aspect-4/3 shrink-0 overflow-hidden">
                  {card.imageSrc ? (
                    <Image
                      src={card.imageSrc}
                      alt={`A ${card.title.toLowerCase()} session with a child`}
                      fill
                      placeholder="blur"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="photo-treatment size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="size-full transition-transform duration-500 group-hover:scale-105"
                      style={{ background: PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length] }}
                    />
                  )}
                </div>
                <div className="p-8">
                  <div className="relative -mt-[52px] flex size-10 items-center justify-center rounded-xl border border-charcoal/8 bg-canvas-white text-terracotta">
                    <Icon icon={card.icon} size="md" />
                  </div>
                  <h3 className="mt-4 font-serif text-xl text-charcoal">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{card.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Link
          href="/search"
          className="group mx-auto mt-10 flex w-fit items-center gap-2 rounded-full border border-rust-dark px-6 py-3 text-sm font-semibold text-rust-dark transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-rust-dark hover:text-canvas-white"
        >
          Browse verified therapists
          <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
