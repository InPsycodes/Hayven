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

function specialtyImage(card: (typeof SPECIALTY_CARDS)[number], index: number, sizes: string) {
  return card.imageSrc ? (
    <Image
      src={card.imageSrc}
      alt={`A ${card.title.toLowerCase()} session with a child`}
      fill
      sizes={sizes}
      className="photo-treatment size-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  ) : (
    <div
      className="size-full transition-transform duration-500 group-hover:scale-105"
      style={{ background: PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length] }}
    />
  );
}

export function Specialties() {
  // Speech Therapy is the specialty families ask for most, so it anchors the
  // section as a dominant card -- the other three read as supporting options
  // rather than four visually identical choices with no sense of priority.
  const [dominant, ...rest] = SPECIALTY_CARDS;

  return (
    <section id="specialties" className="px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-terracotta">Find the right therapist</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            A diverse team, matched to your child&apos;s needs.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            Every specialist on Hayven is admin-verified before their profile goes live, across the
            therapy types families ask for most.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-5">
          <Reveal>
            <Link
              href={`/search?specialty=${encodeURIComponent(dominant.title)}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-charcoal/8 bg-canvas-white transition-colors hover:border-terracotta/40 md:flex-row md:items-center"
            >
              <div className="relative aspect-video overflow-hidden border border-terracotta/60 md:basis-1/3 md:shrink-0">
                {specialtyImage(dominant, 0, "(min-width: 768px) 33vw, 100vw")}
              </div>
              <div className="flex flex-1 flex-col justify-center p-8 lg:p-11">
                <div className="flex size-11 items-center justify-center rounded-xl border border-charcoal/8 bg-canvas-white text-terracotta">
                  <Icon icon={dominant.icon} size="md" />
                </div>
                <h3 className="mt-5 font-serif text-2xl text-charcoal lg:text-[1.85rem]">{dominant.title}</h3>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-ink-soft">{dominant.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-terracotta transition-[gap] group-hover:gap-3">
                  Explore
                  <IconArrowRight size={16} stroke={2} />
                </span>
              </div>
            </Link>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-3">
            {rest.map((card, index) => (
              <Reveal key={card.title} delayMs={(index + 1) * 80}>
                <Link
                  href={`/search?specialty=${encodeURIComponent(card.title)}`}
                  className="group block overflow-hidden rounded-2xl border border-charcoal/8 bg-canvas-white transition-colors hover:border-terracotta/40"
                >
                  <div className="relative aspect-video overflow-hidden border border-terracotta/60">
                    {specialtyImage(card, index + 1, "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-lg text-charcoal">{card.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{card.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
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
