import type { Metadata } from "next";

import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "About Hayven",
  description: "Why Hayven exists, in our founder's own words.",
};

const STORY = [
  "Hayven was born from a personal experience.",
  "A few years ago, while working as a diagnostician at a developmental psychology clinic, I saw firsthand how overwhelming it could be for parents when they first realised that their child might need additional support.",
  "Many mothers arrived with questions, fear, and uncertainty. Some were encountering autism or developmental differences for the first time. They knew that something about their child's development felt different, but they often didn't know what it meant, what to do next, or who they could trust.",
  "And when families are left without clear, accessible information, they can become vulnerable to fear, misinformation, and people who may take advantage of their uncertainty.",
  "I began to imagine a different experience.",
  "What if parents could start understanding their child even before they walked through the clinic doors? What if they could access clear, trustworthy information, understand what their child was experiencing, know what to expect, and feel involved throughout the care journey?",
  "That vision became Hayven.",
  "Hayven exists to create a personal connection between a mother, her child, and the support they both need. We help parents and caregivers better understand their children and stay connected to their care, from the first questions they have, through assessment and therapy, and along the journey that follows.",
  "Because parents shouldn't feel like they are standing outside their child's care, trying to figure everything out alone.",
  "We believe that when parents understand more, they can support their children with greater confidence, connection, and compassion.",
  "That is why we built Hayven.",
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-canvas-white px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-2xl">
          <span className="eyebrow text-terracotta">About Hayven</span>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Helping families understand, connect, and feel supported.
          </h1>

          <div className="mt-10 flex flex-col gap-5">
            {STORY.map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </div>

          <p className="mt-10 border-t border-charcoal/10 pt-6 text-sm font-medium text-charcoal">
            Ademola, Founder of Hayven
          </p>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
