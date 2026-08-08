import Image from "next/image";
import Link from "next/link";
import { IconCheck, IconArrowRight, IconArrowDown } from "@tabler/icons-react";

import { HERO_STAT } from "@/content/marketing/stats";

const TEXT_SHADOW = "0 2px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.45)";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <Image
        src="/images/hero-family.jpg"
        alt="A parent and child laughing together at home"
        fill
        priority
        sizes="100vw"
        className="photo-treatment object-cover object-[center_30%]"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,16,13,0.62) 0%, rgba(20,16,13,0.28) 26%, rgba(20,16,13,0.18) 45%, rgba(20,16,13,0.62) 76%, rgba(20,16,13,0.9) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(20,16,13,0.8) 0%, rgba(20,16,13,0.58) 32%, rgba(20,16,13,0.22) 56%, rgba(20,16,13,0.08) 68%, rgba(20,16,13,0.32) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-28 pb-16 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex max-w-2xl flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm text-canvas-white backdrop-blur-sm">
              <IconCheck size={16} stroke={2.5} />
              Family-centred paediatric therapy
            </span>

            <h1
              className="font-serif text-[2.75rem] leading-[1.08] tracking-tight text-canvas-white [text-wrap:balance] sm:text-6xl lg:text-[4rem]"
              style={{ textShadow: TEXT_SHADOW }}
            >
              A calmer path to the{" "}
              <em className="font-normal text-rust-light italic">right care</em> for
              your child.
            </h1>

            <p
              className="max-w-lg text-lg text-canvas-white/85"
              style={{ textShadow: TEXT_SHADOW }}
            >
              Hayven connects Nigerian families with verified speech, occupational and ABA
              therapists, from your first intake form to booking, dashboards and everyday
              progress.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup?role=parent"
                className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3.5 text-sm font-semibold text-canvas-white transition-colors hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                I&apos;m a parent
                <IconArrowRight size={16} stroke={2} />
              </Link>
              <Link
                href="/signup?role=therapist"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-canvas-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                I&apos;m a therapist
              </Link>
            </div>

            <Link
              href="/needs-assessment"
              className="w-fit text-sm text-canvas-white/75 underline decoration-white/40 underline-offset-4 transition-colors hover:text-canvas-white"
            >
              Take the 2-minute matching quiz →
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/20 px-6 py-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-canvas-white/70">{HERO_STAT.eyebrow}</span>
            <span className="w-fit border-b border-rust-light text-sm text-canvas-white/90">
              {HERO_STAT.line}
            </span>
          </div>
          <a
            href="#specialties"
            aria-label="Scroll to specialties"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-canvas-white transition-colors hover:bg-white/10"
          >
            <IconArrowDown size={18} stroke={1.75} />
          </a>
        </div>
      </div>
    </section>
  );
}
