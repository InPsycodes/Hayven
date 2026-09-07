import Image from "next/image";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { SPECIALTY_CARDS } from "@/content/marketing/specialties";
import { Icon } from "@/components/ui/icon";

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
    <section id="specialties" className="px-6 pt-6 pb-16 sm:pt-8 sm:pb-20 lg:px-10 lg:pt-3 lg:pb-36">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="eyebrow text-rust-dark">Find the right therapist</span>
          <h2 className="mx-auto mt-3 max-w-2xl font-serif text-[1.7rem] leading-tight text-charcoal sm:text-4xl lg:max-w-none lg:text-[2.75rem] lg:whitespace-nowrap">
            A diverse team, matched to your child&apos;s needs.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft lg:max-w-none lg:whitespace-nowrap">
            Every specialist on Hayven is admin-verified before their profile goes live, across the
            therapy types families ask for most.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {SPECIALTY_CARDS.map((card, index) => (
            <div key={card.title} className="h-full">
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-canvas-white transition-colors hover:border-charcoal/20">
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
                <div className="p-5 sm:p-6">
                  <div className="relative -mt-[46px] flex size-10 items-center justify-center rounded-xl border border-charcoal/10 bg-canvas-white text-terracotta">
                    <Icon icon={card.icon} size="md" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg text-charcoal sm:text-xl">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/search"
          className="group mx-auto mt-10 flex w-fit items-center gap-2 rounded-full border border-rust-dark px-6 py-3 text-sm font-semibold text-rust-dark transition-colors duration-200 hover:bg-rust-dark hover:text-canvas-white"
        >
          Browse verified therapists
          <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
