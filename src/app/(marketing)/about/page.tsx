import type { Metadata } from "next";
import Image from "next/image";
import { IconBulb, IconUsersGroup, IconHeartHandshake } from "@tabler/icons-react";

import { FinalCta } from "@/components/marketing/final-cta";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { Reveal } from "@/components/marketing/reveal";
import { Icon } from "@/components/ui/icon";

import founderImage from "../../../../public/images/about-founder.jpg";

export const metadata: Metadata = {
  title: "About Hayven",
  description: "Why Hayven exists, in our founder's own words.",
};

// The founder's letter, verbatim -- grouped into movements so the page can
// give it a lead paragraph, a breath, and a pull-quote instead of one flat
// column.
const OPENING = [
  "Hayven was born from a personal experience. A few years ago, while working as a diagnostician at a developmental psychology clinic, I saw firsthand how overwhelming it could be for parents when they first realised that their child might need additional support.",
  "Many mothers arrived with questions, fear, and uncertainty. Some were encountering autism or developmental differences for the first time. They knew that something about their child's development felt different, but they often didn't know what it meant, what to do next, or who they could trust.",
  "And when families are left without clear, accessible information, they can become vulnerable to fear, misinformation, and people who may take advantage of their uncertainty.",
];

const TURN = [
  "I began to imagine a different experience. What if parents could start understanding their child even before they walked through the clinic doors? What if they could access clear, trustworthy information, understand what their child was experiencing, know what to expect, and feel involved throughout the care journey?",
];

const CLOSING = [
  "Hayven exists to create a personal connection between a mother, her child, and the support they both need. We help parents and caregivers better understand their children and stay connected to their care, from the first questions they have, through assessment and therapy, and along the journey that follows.",
  "Because parents shouldn't feel like they are standing outside their child's care, trying to figure everything out alone. We believe that when parents understand more, they can support their children with greater confidence, connection, and compassion.",
  "That is why we built Hayven.",
];

const PILLARS = [
  {
    icon: IconBulb,
    title: "Understand",
    body: "Plain-language answers and a guided assessment, so the first step doesn't start with a panicked search.",
  },
  {
    icon: IconUsersGroup,
    title: "Connect",
    body: "Every therapist is admin-verified before their profile goes live. Match on concern, budget, and how sessions work for you.",
  },
  {
    icon: IconHeartHandshake,
    title: "Feel supported",
    body: "Session reports, progress you can follow, and a direct line to your child's therapist, all in one place.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-canvas-white px-6 pt-16 pb-16 md:px-10 md:pt-24 md:pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <span className="eyebrow text-rust-dark">About Hayven</span>
            <h1 className="mt-4 font-serif text-3xl leading-[1.1] text-charcoal sm:text-4xl lg:text-[2.9rem]">
              We started Hayven so no parent has to figure it out alone.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              A calmer path from the first worried question, through assessment and therapy,
              to everyday progress you can actually see.
            </p>
          </div>
          <Reveal className="md:justify-self-end">
            <Image
              src={founderImage}
              alt="Ademola, founder of Hayven"
              placeholder="blur"
              priority
              sizes="(max-width: 768px) 100vw, 420px"
              className="w-full max-w-[380px] rounded-2xl object-cover ring-1 ring-charcoal/10 md:max-w-[420px]"
            />
          </Reveal>
        </div>
      </section>

      {/* The letter */}
      <section className="border-t border-charcoal/8 bg-canvas-white px-6 py-20 md:px-10 md:py-24">
        <article className="mx-auto max-w-2xl">
          <p className="font-serif text-xl leading-relaxed text-charcoal sm:text-[1.4rem]">
            {OPENING[0]}
          </p>
          <div className="mt-6 flex flex-col gap-5">
            {OPENING.slice(1).map((p) => (
              <p key={p} className="text-base leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </div>

          <hr className="my-10 border-charcoal/10" />

          {TURN.map((p) => (
            <p key={p} className="text-base leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}

          <blockquote className="my-10 border-l-[3px] border-terracotta pl-5 font-serif text-2xl italic leading-snug text-rust-dark sm:text-[1.9rem]">
            That vision became Hayven.
          </blockquote>

          <div className="flex flex-col gap-5">
            {CLOSING.map((p) => (
              <p key={p} className="text-base leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3.5 border-t border-charcoal/10 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-terracotta font-serif text-base font-semibold text-white">
              A
            </span>
            <div>
              <p className="text-sm font-semibold text-charcoal">Ademola</p>
              <p className="text-[13px] text-muted-foreground">Founder, Hayven</p>
            </div>
          </div>
        </article>
      </section>

      {/* What Hayven is for */}
      <section className="border-y border-charcoal/8 bg-ivory px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <span className="eyebrow text-ink-soft">What Hayven is for</span>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delayMs={i * 80}>
                <div className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                    <Icon icon={pillar.icon} size="md" />
                  </span>
                  <h3 className="mt-1 font-serif text-xl text-charcoal">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <TrustStrip />

      <FinalCta />
    </div>
  );
}
