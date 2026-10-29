import Image from "next/image";
import { Caveat } from "next/font/google";
import { IconHeart, IconPlant2, IconShieldCheck, IconUsers } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import familyImage from "../../../public/images/hero-family.jpg";

// The cream-band header shared by /who-we-serve and each age group page:
// eyebrow, a brush underline, reassurance points, and a background photo
// fading into the cream, with a handwritten note.

// Self-hosted by next/font like the site's other faces, so the CSP's
// font-src 'self' still holds. Only used for the handwritten notes.
const handwriting = Caveat({ subsets: ["latin"], weight: ["500"], display: "swap" });

const POINTS = [
  { icon: IconShieldCheck, label: "Verified professionals", tone: "peach" },
  { icon: IconUsers, label: "Whole-family support", tone: "sage" },
  { icon: IconHeart, label: "Personalised care plans", tone: "peach" },
  { icon: IconPlant2, label: "Support at every stage", tone: "sage" },
] as const;

/**
 * The cream band with decorative leaves and a wave into the beige page
 * below. The photo is the band's background, not a framed picture: it fills
 * the right side and fades into the cream behind the copy (on phones it
 * sits across the top and fades down into the copy). `photo` must be a
 * fill-mode image; a light terracotta wash keeps differently lit photos
 * consistent.
 */
export function HeroBand({
  copy,
  photo,
  note,
}: {
  copy: React.ReactNode;
  photo?: React.ReactNode;
  /** Handwritten note over the photo on wide screens, one entry per line. */
  note?: string[];
}) {
  return (
    <section className="relative overflow-hidden bg-[#f8efe6] pb-24 md:pt-28 md:pb-32">
      {photo && (
        <div className="relative h-72 [mask-image:linear-gradient(to_bottom,black_55%,transparent)] sm:h-96 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[58%] md:[mask-image:linear-gradient(to_right,transparent,black_40%)]">
          {photo}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#e09a76]/20 mix-blend-soft-light" />
          {note && (
            <p
              aria-hidden
              className={cn(
                handwriting.className,
                "absolute right-12 bottom-36 hidden -rotate-6 text-right text-[1.8rem] leading-[1.05] text-canvas-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)] xl:block"
              )}
            >
              {note.map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
      <svg
        aria-hidden
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-offwhite md:h-20"
      >
        <path d="M0 48C240 8 480 72 760 44C1040 16 1240 30 1440 52V80H0Z" fill="currentColor" />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 180 200"
        className="pointer-events-none absolute -bottom-6 -left-8 hidden w-40 md:block lg:w-48"
      >
        <path d="M18 200C-10 150 4 92 30 60c10 40 14 98-12 140Z" fill="#f2a98a" opacity="0.75" />
        <path d="M40 200C46 150 80 108 124 92c-20 40-46 82-84 108Z" fill="#6b7a4e" />
        <path d="M30 200C40 172 70 152 104 150c-20 22-44 40-74 50Z" fill="#7d8b5c" />
      </svg>

      <div className={cn("relative mx-auto max-w-6xl px-6 md:px-10", photo ? "-mt-12 md:mt-0" : "pt-20 md:pt-0")}>
        <div className="md:max-w-[48%] lg:max-w-[46%]">{copy}</div>
      </div>
    </section>
  );
}

export function HeroEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[13px] font-semibold tracking-[0.14em] text-terracotta uppercase">{children}</span>
  );
}

/** A headline whose last word gets the terracotta brush underline. */
export function UnderlinedHeadline({ text, className }: { text: string; className?: string }) {
  const cut = text.lastIndexOf(" ");
  const lead = cut === -1 ? "" : text.slice(0, cut + 1);
  const last = cut === -1 ? text : text.slice(cut + 1);
  return (
    <h1 className={cn("font-serif text-[2.3rem] leading-[1.06] text-charcoal sm:text-5xl lg:text-[4rem]", className)}>
      {lead}
      <span className="relative inline-block whitespace-nowrap">
        {last}
        <svg
          aria-hidden
          viewBox="0 0 200 14"
          preserveAspectRatio="none"
          className="absolute -bottom-2 left-0 h-3 w-[88%] text-terracotta"
        >
          <path d="M3 9.5C45 4 105 3 197 6.5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
    </h1>
  );
}

export function ReassurancePoints({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0", className)}>
      {POINTS.map((point, index) => (
        <li
          key={point.label}
          className={cn(
            "flex flex-col gap-3 pr-4 sm:px-4 lg:px-5",
            index === 0 && "sm:pl-0 lg:pl-0",
            index > 0 && "sm:border-l sm:border-charcoal/10"
          )}
        >
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              point.tone === "peach" ? "bg-[#f6d6c3] text-rust-dark" : "bg-[#dcdccb] text-[#4f5a3a]"
            )}
          >
            <Icon icon={point.icon} size="md" />
          </span>
          <span className="text-sm leading-snug text-charcoal/80">{point.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** The /who-we-serve header. */
export function WhoWeServeHero() {
  return (
    <HeroBand
      copy={
        <>
          <HeroEyebrow>Who we serve</HeroEyebrow>
          <UnderlinedHeadline text="For every child, and the family around them." className="mt-6" />
          <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            From a baby&apos;s first milestones to the pressures of the teenage years, Hayven connects Nigerian
            families <strong className="font-semibold text-charcoal">with verified</strong> psychologists and speech,
            occupational and ABA therapists who work with children at every stage.
          </p>
          <ReassurancePoints className="mt-10" />
        </>
      }
      note={["Healthier minds.", "Brighter futures."]}
      photo={
        <Image
          src={familyImage}
          alt="A mother holding her sleeping baby close at home"
          placeholder="blur"
          priority
          fill
          sizes="(min-width: 768px) 60vw, 100vw"
          className="photo-treatment object-cover"
          style={{ objectPosition: "62% 40%" }}
        />
      }
    />
  );
}
