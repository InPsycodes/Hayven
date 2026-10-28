import Image from "next/image";
import Link from "next/link";
import { IconCheck, IconArrowRight, IconArrowDown, IconSparkles } from "@tabler/icons-react";

import heroImage from "../../../public/images/hero-family.jpg";

const TEXT_SHADOW = "0 2px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.45)";

export function Hero() {
  return (
    <section className="relative flex min-h-[90svh] flex-col overflow-hidden sm:min-h-[100svh]">
      <Image
        src={heroImage}
        alt="A parent and child laughing together at home"
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="photo-treatment object-cover object-[68%_18%] sm:object-[center_30%]"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(36,22,14,0.56) 0%, rgba(36,22,14,0.22) 26%, rgba(36,22,14,0.14) 45%, rgba(36,22,14,0.56) 76%, rgba(36,22,14,0.84) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(36,22,14,0.72) 0%, rgba(36,22,14,0.5) 32%, rgba(36,22,14,0.18) 56%, rgba(36,22,14,0.06) 68%, rgba(36,22,14,0.26) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-28 pb-14 sm:pt-32 sm:pb-20 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex max-w-2xl flex-col gap-5 sm:gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-[0.66rem] text-canvas-white backdrop-blur-sm sm:text-sm">
              <IconCheck size={16} stroke={2.5} />
              Family-centred paediatric therapy
            </span>

            <h1
              className="font-serif text-[1.5rem] leading-[1.15] tracking-tight text-canvas-white [text-wrap:balance] sm:text-5xl sm:leading-[1.12] lg:text-[4rem]"
              style={{ textShadow: TEXT_SHADOW }}
            >
              A calmer path to the{" "}
              <em className="font-normal not-italic">right care</em> for
              your child.
            </h1>

            <p
              className="max-w-lg text-[0.75rem] text-canvas-white/85 sm:text-lg"
              style={{ textShadow: TEXT_SHADOW }}
            >
              Hayven connects Nigerian families with verified psychologists and speech,
              occupational and ABA therapists, from your first intake form to booking,
              dashboards and everyday progress.
            </p>

            <Link
              href="/needs-assessment"
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-rust-light/50 bg-terracotta/20 px-5 py-2.5 text-[0.66rem] font-semibold text-canvas-white backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-terracotta/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust-light sm:text-sm"
            >
              <IconSparkles size={15} stroke={2} className="text-rust-light" />
              Take the 2-minute matching quiz
              <IconArrowRight size={14} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

            <div className="flex flex-nowrap items-center gap-2.5 sm:gap-4">
              <Link
                href="/signup?role=parent"
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-terracotta px-4 py-3 text-[10px] font-semibold text-canvas-white transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta sm:px-6 sm:py-3.5 sm:text-sm"
              >
                I&apos;m a parent
                <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signup?role=therapist"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-4 py-3 text-[10px] font-semibold text-canvas-white backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6 sm:py-3.5 sm:text-sm"
              >
                I&apos;m a therapist
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center px-6 pb-8 sm:pb-10">
        <a
          href="#specialties"
          aria-label="Scroll to what's next"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-canvas-white transition-colors hover:bg-white/10"
        >
          <IconArrowDown size={18} stroke={1.75} />
        </a>
      </div>
    </section>
  );
}
