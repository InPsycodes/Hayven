import Link from "next/link";
import { IconAlertTriangle, IconArrowLeft, IconArrowRight } from "@tabler/icons-react";

import { AgeGroupPortrait } from "@/components/marketing/age-group-portrait";
import { Reveal } from "@/components/marketing/reveal";
import {
  HeroBand,
  HeroEyebrow,
  ReassurancePoints,
  UnderlinedHeadline,
} from "@/components/marketing/who-we-serve-hero";
import { Icon } from "@/components/ui/icon";
import { PROFESSIONALS, professionalSearchHref, type AgeGroup } from "@/content/marketing/age-groups";
import { EMERGENCY_NUMBER } from "@/content/safeguarding";

// The body of /who-we-serve/[slug]; the route file only resolves the group
// and where "Get support now" should go.

const STEPS = [
  { title: "Tell us about your child", body: "A short intake on what you are noticing, at your own pace." },
  {
    title: "Book a verified professional",
    body: "Choose by specialty, location, price and in-person or virtual sessions.",
  },
  { title: "Follow their progress", body: "Session reports, home practice and messages, all in one place." },
];

/** `supportHref`: where every "Get support now" goes -- parent sign-up, or the visitor's own dashboard when signed in. */
export function AgeGroupPage({ group, supportHref }: { group: AgeGroup; supportHref: string }) {
  return (
    <div className="flex flex-col bg-offwhite">
      <HeroBand
        copy={
          <>
            <Link
              href="/who-we-serve"
              className="mb-5 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-rust-dark hover:text-terracotta"
            >
              <Icon icon={IconArrowLeft} size="sm" />
              Who we serve
            </Link>
            <HeroEyebrow>
              {group.title}, {group.agesLabel}
            </HeroEyebrow>
            <UnderlinedHeadline text={group.headline} className="mt-6 lg:text-[3.6rem]" />
            <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">{group.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href={supportHref}
                className="rounded-full bg-terracotta px-7 py-3.5 text-sm font-semibold text-canvas-white transition-colors hover:bg-rust-dark"
              >
                Get support now
              </Link>
              <Link href="/needs-assessment" className="py-2 text-sm font-semibold text-rust-dark hover:text-terracotta">
                Not sure where to start? Take the quiz
              </Link>
            </div>
            <ReassurancePoints className="mt-10" />
          </>
        }
        note={group.note}
        photo={
          // No photo yet: the band shows the copy on plain cream.
          group.image ? (
            <AgeGroupPortrait group={group} priority sizes="(min-width: 768px) 60vw, 100vw" className="absolute inset-0" />
          ) : undefined
        }
      />
      <div aria-hidden className="h-8 md:h-12" />

      {group.showEmergencyNotice && (
        <section aria-label="In an emergency" className="px-6 pb-12 md:px-10">
          <div className="mx-auto flex max-w-6xl gap-3 rounded-2xl bg-canvas-white p-5 text-[15px] leading-relaxed text-ink-soft">
            <Icon icon={IconAlertTriangle} size="md" className="mt-0.5 shrink-0 text-rust-dark" />
            <p>
              <strong className="font-semibold text-charcoal">In an emergency:</strong> if your child is in immediate
              danger or has harmed themselves, call {EMERGENCY_NUMBER} or go to your nearest hospital emergency
              department. Hayven is not an emergency service.
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="concerns-heading" className="px-6 pb-16 md:px-10 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 id="concerns-heading" className="font-serif text-[1.8rem] leading-tight text-charcoal sm:text-4xl">
            Common reasons families reach out
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
            Every child is different. These are the concerns parents of children {group.agesLabel} bring to us most.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {group.concerns.map((concern, index) => (
              <li key={concern.title}>
                <Reveal delayMs={index * 50} className="h-full rounded-2xl bg-canvas-white p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-offwhite/60 text-rust-dark">
                    <Icon icon={concern.icon} size="md" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-charcoal">{concern.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{concern.detail}</p>
                  <p className="mt-4 text-[13px] text-ink-soft">
                    Usually helps:{" "}
                    {concern.helpers.map((helper, i) => (
                      <span key={helper}>
                        {i > 0 && " or "}
                        <Link
                          href={professionalSearchHref(helper)}
                          className="font-semibold text-rust-dark underline decoration-rust-dark/30 underline-offset-2 hover:text-terracotta hover:decoration-terracotta"
                        >
                          {i === 0 ? PROFESSIONALS[helper].label : PROFESSIONALS[helper].label.toLowerCase()}
                        </Link>
                      </span>
                    ))}
                    {concern.helperNote && ` ${concern.helperNote}`}
                  </p>
                </Reveal>
              </li>
            ))}
            <li>
              <Reveal
                delayMs={group.concerns.length * 50}
                className="flex h-full flex-col justify-between gap-5 rounded-2xl bg-[#181410] p-6"
              >
                <p className="font-serif text-[1.35rem] leading-snug text-canvas-white">Something else on your mind?</p>
                <Link
                  href={supportHref}
                  className="group inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-rust-light hover:text-canvas-white"
                >
                  Tell us about your child
                  <Icon
                    icon={IconArrowRight}
                    size="sm"
                    className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                  />
                </Link>
              </Reveal>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="px-6 pb-16 md:px-10 md:pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-canvas-white px-6 py-10 sm:px-10 md:py-12">
          <h2 id="steps-heading" className="font-serif text-[1.6rem] leading-tight text-charcoal sm:text-[2rem]">
            How getting support works
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="font-serif text-3xl text-terracotta">{index + 1}</span>
                <h3 className="mt-2 text-base font-semibold text-charcoal">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="read-heading" className="px-6 pb-16 md:px-10 md:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="read-heading" className="label-micro text-rust-dark">
              Read next
            </h2>
            <Link
              href={`/learn/${group.article.slug}`}
              className="mt-2 block font-serif text-xl text-charcoal hover:text-rust-dark sm:text-2xl"
            >
              {group.article.title}
            </Link>
          </div>
          <Link href="/learn" className="py-2 text-sm font-semibold text-rust-dark hover:text-terracotta">
            More guides in the Learning Center
          </Link>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl bg-terracotta px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between md:py-12">
          <h2 id="cta-heading" className="font-serif text-[1.7rem] leading-tight text-canvas-white sm:text-[2.1rem]">
            You do not have to work this out alone.
          </h2>
          <Link
            href={supportHref}
            className="self-start rounded-full bg-charcoal px-7 py-3.5 text-sm font-semibold text-canvas-white transition-colors hover:bg-charcoal/85 md:self-auto"
          >
            Get support now
          </Link>
        </div>
      </section>
    </div>
  );
}
