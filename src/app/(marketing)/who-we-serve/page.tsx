import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconBook2, IconChartLine, IconHome, IconMessages } from "@tabler/icons-react";

import { AgeGroupPortrait } from "@/components/marketing/age-group-portrait";
import { Reveal } from "@/components/marketing/reveal";
import { Icon } from "@/components/ui/icon";
import {
  AGE_GROUPS,
  PROFESSIONALS,
  professionalSearchHref,
  type Professional,
} from "@/content/marketing/age-groups";
import { canonicalFor } from "@/lib/seo/metadata";

import familyImage from "../../../../public/images/hero-family.jpg";

export const metadata: Metadata = {
  title: "Who We Serve",
  description:
    "Hayven supports children from babies to teenagers, and the parents and caregivers around them, with verified psychologists and speech, occupational and ABA therapists across Nigeria.",
  alternates: canonicalFor("/who-we-serve"),
};

const PARENT_SUPPORT = [
  {
    icon: IconChartLine,
    title: "Reports in plain language",
    body: "After each session, see what your child worked on and how they are progressing.",
  },
  {
    icon: IconHome,
    title: "Practice at home",
    body: "Short weekly activities from your therapist, with a quick check-in on how they went.",
  },
  {
    icon: IconMessages,
    title: "Message your therapist",
    body: "Ask questions between sessions without chasing anyone on the phone.",
  },
  {
    icon: IconBook2,
    title: "Learn as you go",
    body: "Clear guides in the Learning Center on what to expect and how to help.",
  },
];

const WHO_HELPS: { notice: string; who: Professional }[] = [
  { notice: "Few words, unclear speech, stuttering", who: "speech" },
  { notice: "Trouble with handwriting, dressing, or noise and textures", who: "occupational" },
  { notice: "Behaviour that is hard to manage, or social skills after an autism diagnosis", who: "aba" },
  { notice: "Worry, low mood, attention or learning concerns, or you want an assessment", who: "psychologist" },
];

export default function WhoWeServePage() {
  return (
    <div className="flex flex-col bg-offwhite">
      <section className="px-6 pt-20 pb-12 md:px-10 md:pt-28 md:pb-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.15fr_0.85fr] md:gap-14">
          <div>
            <span className="eyebrow text-rust-dark">Who we serve</span>
            <h1 className="mt-4 font-serif text-[2.1rem] leading-[1.08] text-charcoal sm:text-5xl lg:text-[3.75rem]">
              For every child, and the family around them.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              From a baby&apos;s first milestones to the pressures of the teenage years, Hayven connects
              Nigerian families with verified psychologists and speech, occupational and ABA therapists
              who work with children at every stage.
            </p>
          </div>
          <Image
            src={familyImage}
            alt="A mother holding her sleeping baby close at home"
            placeholder="blur"
            priority
            sizes="(min-width: 768px) 40vw, 100vw"
            className="photo-treatment aspect-[4/3] w-full rounded-3xl object-cover md:aspect-[4/5]"
            style={{ objectPosition: "62% 40%" }}
          />
        </div>
      </section>

      <section aria-label="Age groups" className="px-6 pb-16 md:px-10 md:pb-20">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 md:gap-6">
          {AGE_GROUPS.map((group, index) => (
            <Reveal key={group.title} delayMs={index * 60}>
              <article className="flex h-full flex-col gap-6 rounded-2xl bg-canvas-white p-6 sm:flex-row sm:items-center sm:p-8">
                <AgeGroupPortrait
                  group={group}
                  sizes="288px"
                  zoom={group.image?.cardZoom}
                  className="size-28 rounded-full sm:size-36"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-2xl text-charcoal">
                    {group.title} <span className="text-rust-dark">{group.ages}</span>
                  </h2>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{group.cardLine}</p>
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Common reasons families come">
                    {group.cardConcerns.map((concern) => (
                      <li key={concern} className="rounded-full bg-offwhite/60 px-3 py-1 text-[13px] text-ink-soft">
                        {concern}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/who-we-serve/${group.slug}`}
                    className="group mt-4 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-rust-dark hover:text-terracotta"
                  >
                    Learn more about {group.agesLabel}
                    <Icon
                      icon={IconArrowRight}
                      size="sm"
                      className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="parents-heading" className="px-6 pb-16 md:px-10 md:pb-20">
        <div className="mx-auto grid max-w-6xl gap-10 rounded-3xl bg-[#181410] px-6 py-12 sm:px-10 md:py-14 lg:grid-cols-[0.9fr_1.4fr] lg:gap-14">
          <div>
            <span className="eyebrow text-rust-light">Parents and caregivers</span>
            <h2
              id="parents-heading"
              className="mt-4 font-serif text-[1.8rem] leading-tight text-canvas-white sm:text-4xl"
            >
              You are part of the care too.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-canvas-white/70">
              Progress happens between sessions as much as in them. Hayven keeps you informed and gives
              you simple things to do at home.
            </p>
          </div>
          <ul className="grid gap-7 sm:grid-cols-2">
            {PARENT_SUPPORT.map((item) => (
              <li key={item.title}>
                <Icon icon={item.icon} size="md" className="text-rust-light" />
                <h3 className="mt-3 text-base font-semibold text-canvas-white">{item.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-canvas-white/70">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="who-helps-heading" className="px-6 pb-16 md:px-10 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 id="who-helps-heading" className="font-serif text-[1.8rem] leading-tight text-charcoal sm:text-4xl">
            Not sure who your child needs?
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
            Start with what you are noticing. Here is who usually helps.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {WHO_HELPS.map((row) => (
              <li key={row.who} className="rounded-2xl bg-canvas-white p-6">
                <p className="text-sm text-ink-soft">If you notice</p>
                <p className="mt-1 text-base font-semibold leading-snug text-charcoal">{row.notice}</p>
                <p className="mt-5 text-sm text-ink-soft">Who helps</p>
                <Link
                  href={professionalSearchHref(row.who)}
                  className="group mt-1 inline-block font-serif text-xl text-rust-dark hover:text-terracotta"
                >
                  {PROFESSIONALS[row.who].label}
                  <Icon
                    icon={IconArrowRight}
                    size="sm"
                    className="ml-1.5 inline align-[-1px] transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] text-ink-soft">
            Still unsure? Answer a few questions and we will suggest where to start.{" "}
            <Link href="/needs-assessment" className="font-semibold text-rust-dark hover:text-terracotta">
              Take the matching quiz
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl bg-canvas-white px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between md:py-12">
          <div>
            <h2 id="cta-heading" className="font-serif text-[1.7rem] leading-tight text-charcoal sm:text-[2.1rem]">
              Find the right support for your child.
            </h2>
            <p className="mt-2 text-base text-ink-soft">
              Every professional on Hayven is checked before their profile goes live.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-full bg-terracotta px-6 py-3.5 text-sm font-semibold text-canvas-white transition-colors hover:bg-rust-dark"
            >
              Find a therapist
            </Link>
            <a
              href="mailto:hayvenmind@gmail.com"
              className="rounded-full border border-charcoal/80 px-6 py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal/5"
            >
              Talk to us first
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
