import Image from "next/image";
import { Caveat } from "next/font/google";
import { IconHeart, IconPlant2, IconShieldCheck, IconUsers } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import familyImage from "../../../public/images/hero-family.jpg";

// Self-hosted by next/font like the site's other faces, so the CSP's
// font-src 'self' still holds. Only used for the handwritten note.
const handwriting = Caveat({ subsets: ["latin"], weight: ["500"], display: "swap" });

const POINTS = [
  { icon: IconShieldCheck, label: "Verified professionals", tone: "peach" },
  { icon: IconUsers, label: "Whole-family support", tone: "sage" },
  { icon: IconHeart, label: "Personalised care plans", tone: "peach" },
  { icon: IconPlant2, label: "Support at every stage", tone: "sage" },
] as const;

/** The /who-we-serve header: copy and reassurance points beside a tilted family photo, on a lighter cream band. */
export function WhoWeServeHero() {
  return (
    <section className="relative overflow-hidden bg-[#f8efe6] px-6 pt-20 pb-24 md:px-10 md:pt-28 md:pb-32">
      {/* Soft wave into the page's beige below, instead of a hard edge. */}
      <svg
        aria-hidden
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-offwhite md:h-20"
      >
        <path d="M0 48C240 8 480 72 760 44C1040 16 1240 30 1440 52V80H0Z" fill="currentColor" />
      </svg>
      {/* Decorative leaves and blob, bottom left. */}
      <svg
        aria-hidden
        viewBox="0 0 180 200"
        className="pointer-events-none absolute -bottom-6 -left-8 hidden w-40 md:block lg:w-48"
      >
        <path d="M18 200C-10 150 4 92 30 60c10 40 14 98-12 140Z" fill="#f2a98a" opacity="0.75" />
        <path d="M40 200C46 150 80 108 124 92c-20 40-46 82-84 108Z" fill="#6b7a4e" />
        <path d="M30 200C40 172 70 152 104 150c-20 22-44 40-74 50Z" fill="#7d8b5c" />
      </svg>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
        <div>
          <span className="flex items-center gap-3 text-[13px] font-semibold tracking-[0.14em] text-terracotta uppercase">
            <span aria-hidden className="h-0.5 w-8 rounded-full bg-terracotta" />
            Who we serve
          </span>
          <h1 className="mt-6 font-serif text-[2.3rem] leading-[1.06] text-charcoal sm:text-5xl lg:text-[4rem]">
            For every child, and the family around{" "}
            <span className="relative inline-block whitespace-nowrap">
              them.
              <svg
                aria-hidden
                viewBox="0 0 200 14"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-[88%] text-terracotta"
              >
                <path
                  d="M3 9.5C45 4 105 3 197 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            From a baby&apos;s first milestones to the pressures of the teenage years, Hayven connects Nigerian
            families <strong className="font-semibold text-charcoal">with verified</strong> psychologists and speech,
            occupational and ABA therapists who work with children at every stage.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0">
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
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          {/* Shapes behind the photo: a terracotta blob top left, a soft cream one bottom right. */}
          <div
            aria-hidden
            className="absolute -top-6 -left-6 size-32 rounded-[42%_58%_55%_45%/50%_45%_55%_50%] bg-[#e09a76] sm:size-40"
          />
          <div
            aria-hidden
            className="absolute -right-8 -bottom-8 size-48 rounded-[55%_45%_40%_60%/50%_60%_40%_50%] bg-[#f1e2d0] sm:size-64"
          />
          <div className="relative md:-rotate-[1.5deg]">
            <Image
              src={familyImage}
              alt="A mother holding her sleeping baby close at home"
              placeholder="blur"
              priority
              sizes="(min-width: 768px) 45vw, 100vw"
              className="photo-treatment aspect-[4/3] w-full rounded-3xl object-cover shadow-[0_24px_48px_-28px_rgba(60,35,20,0.45)] md:aspect-[5/6]"
              style={{ objectPosition: "62% 40%" }}
            />
          </div>
          <p
            aria-hidden
            className={cn(
              handwriting.className,
              "absolute top-16 -right-4 hidden w-28 -rotate-12 text-center text-[1.6rem] leading-[1.05] text-terracotta xl:-right-24 xl:block"
            )}
          >
            Healthier minds.
            <br />
            Brighter futures.
            <svg viewBox="0 0 24 24" className="mx-auto mt-1 size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}
