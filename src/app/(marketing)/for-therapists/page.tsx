import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconArrowDown } from "@tabler/icons-react";

import { canonicalFor } from "@/lib/seo/metadata";
import { formatNaira } from "@/data/format";
import { COMMISSION_RATE, MIN_PAYOUT_NAIRA } from "@/lib/payouts/commission";
import heroImage from "../../../../public/images/for-therapists-hero.jpg";

const TEXT_SHADOW = "0 2px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.45)";

const THERAPIST_SHARE = Math.round((1 - COMMISSION_RATE) * 100);

export const metadata: Metadata = {
  title: "For Therapists | Hayven",
  description: "Set your own price, get matched with families already looking for you, and get paid weekly on Hayven.",
  alternates: canonicalFor("/for-therapists"),
};

const STEPS = [
  {
    title: "Apply and get verified",
    body: "Submit your credentials once. We cross-check them with your licensing body.",
  },
  {
    title: "Set price & availability",
    body: "You control both, and can change them any time.",
  },
  {
    title: "Get matched and booked",
    body: "Families find you through Hayven's matching quiz and search. No marketing spend on your end.",
  },
  {
    title: "See families, get paid weekly",
    body: `Earnings clear 72 hours after a session, paid out every Monday once you're at ${formatNaira(MIN_PAYOUT_NAIRA)} or more.`,
  },
];

const FAQS = [
  {
    q: "Am I an employee of Hayven?",
    a: "No, you practise as an independent professional. Hayven handles discovery, booking, and payment collection; the clinical work and judgment stay yours.",
  },
  {
    q: "What does Hayven take?",
    a: `${Math.round(COMMISSION_RATE * 100)}% of each session's price. You keep ${THERAPIST_SHARE}%, paid out weekly.`,
  },
  {
    q: "What do I need to get verified?",
    a: "Your licence and credential documents, and a bit about your practice. We check directly with your professional body before you're listed.",
  },
  {
    q: "Can I set my own schedule?",
    a: "Yes, availability is entirely yours to set and change.",
  },
];

export default function ForTherapistsPage() {
  return (
    <div className="bg-canvas-white">
      {/* ================= HERO ================= */}
      <section className="relative isolate flex min-h-[560px] flex-col overflow-hidden sm:min-h-[640px] md:min-h-[700px]">
        <Image
          src={heroImage}
          alt="A therapist joining a virtual session from home"
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-[center_22%]"
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

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-28 pb-14 md:px-10">
          <div className="mx-auto flex w-full max-w-[1200px] justify-end">
            <div className="max-w-[960px]">
              <span
                className="reveal inline-flex items-center gap-2 rounded-full border border-[rgba(217,161,126,0.4)] bg-[rgba(184,115,76,0.08)] px-4 py-2 text-[0.68rem] font-semibold tracking-[0.12em] text-rust-light uppercase"
                style={{ animationDelay: "100ms" }}
              >
                <span className="size-1.5 rounded-full bg-rust-light" />
                For therapists
              </span>

              <h1
                className="reveal mt-5 max-w-[22ch] font-heading text-[2.1rem] leading-[1.08] font-medium text-canvas-white sm:text-5xl lg:text-[3.6rem]"
                style={{ textShadow: TEXT_SHADOW, animationDelay: "220ms" }}
              >
                Less admin. <em className="font-normal text-rust-light not-italic">More of the families</em> you
                took this job for.
              </h1>

              <p
                className="reveal mt-5 max-w-[60ch] text-[1.08rem] leading-relaxed text-canvas-white/72"
                style={{ textShadow: TEXT_SHADOW, animationDelay: "340ms" }}
              >
                Set your own price, get matched with families already looking for what you do, and let Hayven turn
                your session notes into the report a parent actually reads.
              </p>

              <div className="reveal mt-7 flex flex-wrap gap-3" style={{ animationDelay: "460ms" }}>
                <Link
                  href="/signup?role=therapist"
                  className="inline-flex h-[50px] items-center gap-2 rounded-full bg-terracotta px-7 text-[0.86rem] font-semibold text-canvas-white shadow-[0_10px_26px_-14px_rgba(156,89,52,0.6)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:bg-rust-dark"
                >
                  Apply to join Hayven <IconArrowRight size={16} stroke={2} />
                </Link>
                <a
                  href="#what-you-get"
                  className="inline-flex h-[50px] items-center gap-2 rounded-full border border-white/30 bg-white/[0.04] px-7 text-[0.86rem] font-semibold text-canvas-white transition-[transform,background-color,border-color] duration-200 ease-out hover:-translate-y-px hover:border-white/55 hover:bg-white/10"
                >
                  See how payouts work
                </a>
              </div>

              <div
                className="reveal mt-9 grid max-w-[640px] grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/[0.08] backdrop-blur-sm"
                style={{ animationDelay: "540ms" }}
              >
                <div className="bg-white/[0.03] px-3 py-4 text-center">
                  <div className="font-heading text-xl font-semibold text-rust-light">{THERAPIST_SHARE}%</div>
                  <div className="mt-0.5 text-[0.64rem] text-canvas-white/62">of every session is yours</div>
                </div>
                <div className="bg-white/[0.03] px-3 py-4 text-center">
                  <div className="font-heading text-xl font-semibold text-rust-light">Weekly</div>
                  <div className="mt-0.5 text-[0.64rem] text-canvas-white/62">paid out every Monday</div>
                </div>
                <div className="bg-white/[0.03] px-3 py-4 text-center">
                  <div className="font-heading text-xl font-semibold text-rust-light">You</div>
                  <div className="mt-0.5 text-[0.64rem] text-canvas-white/62">set your own price</div>
                </div>
              </div>

              <p
                className="reveal mt-7 max-w-[42ch] border-t border-white/[0.14] pt-4 text-[0.76rem] text-canvas-white/50"
                style={{ animationDelay: "600ms" }}
              >
                Hayven is a new platform building its first cohort of verified therapists in Lagos. You&apos;d be
                among the first, not the five-hundredth.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-center px-6 pb-8">
          <a
            href="#what-you-get"
            aria-label="Scroll to what's next"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-canvas-white transition-colors hover:bg-white/10"
          >
            <IconArrowDown size={18} stroke={1.75} />
          </a>
        </div>
      </section>

      {/* ================= WHAT YOU GET ================= */}
      <section id="what-you-get" className="bg-canvas-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1320px]">
          <span className="flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.12em] text-terracotta uppercase">
            <span className="h-px w-6 bg-terracotta" />
            What you get
          </span>
          <h2 className="mt-3 max-w-[18ch] font-heading text-4xl leading-[1.05] font-medium text-charcoal sm:text-5xl">
            Built for a real caseload, not a side gig
          </h2>

          <div className="mt-11 grid gap-y-12 gap-x-7 sm:grid-cols-2">
            {/* -- earnings/payout -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="w-full max-w-[400px] overflow-hidden rounded-xl bg-canvas-white p-5 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <span className="inline-block rounded-full bg-success/10 px-2.5 py-0.5 text-[0.64rem] font-bold tracking-[0.06em] text-success-text uppercase">
                    Cleared, ready Monday
                  </span>
                  <div className="mt-2.5 font-heading text-3xl font-semibold text-charcoal">
                    {formatNaira(84000)}
                  </div>
                  <div className="mt-0.5 text-[0.74rem] text-ink-soft">This week&apos;s earnings</div>
                  <div className="mt-3 flex justify-between border-t border-offwhite pt-2 text-[0.78rem]">
                    <span className="text-ink-soft">Your rate per session</span>
                    <span className="font-semibold text-charcoal">You decide</span>
                  </div>
                  <div className="flex justify-between border-t border-offwhite pt-2 text-[0.78rem]">
                    <span className="text-ink-soft">Hayven&apos;s commission</span>
                    <span className="font-semibold text-charcoal">{Math.round(COMMISSION_RATE * 100)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-offwhite pt-2 text-[0.78rem]">
                    <span className="text-ink-soft">Minimum payout</span>
                    <span className="font-semibold text-charcoal">{formatNaira(MIN_PAYOUT_NAIRA)}</span>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">Your price, your terms</h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Set your own rate per session. You keep {THERAPIST_SHARE}% of every session, paid out weekly, every
                Monday, once cleared.
              </p>
            </div>

            {/* -- report auto-gen -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="w-full max-w-[400px] overflow-hidden rounded-xl bg-canvas-white shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <div className="flex items-center gap-2.5 border-b border-offwhite px-4.5 py-4">
                    <span className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-[#f1e4d6] font-heading text-[0.74rem] font-bold text-terracotta">
                      JT
                    </span>
                    <div>
                      <b className="block text-[0.84rem] text-charcoal">Your session note</b>
                      <span className="text-[0.72rem] text-ink-soft">Clinical, for your records</span>
                    </div>
                  </div>
                  <div className="px-4.5 py-4 pb-5">
                    <p className="mb-2.5 rounded-lg bg-ivory/70 px-3.5 py-2.5 text-[0.84rem] leading-relaxed text-charcoal">
                      Client demonstrated improved receptive language accuracy across trials&hellip;
                    </p>
                    <div className="flex items-center justify-center gap-2 py-2 text-[0.72rem] text-ink-soft">
                      <IconArrowDown size={14} stroke={2} />
                      Hayven generates the parent-facing version
                      <IconArrowDown size={14} stroke={2} />
                    </div>
                    <p className="rounded-lg bg-ivory/70 px-3.5 py-2.5 text-[0.84rem] leading-relaxed text-charcoal">
                      Today we worked on communication. Your child followed most instructions independently.
                    </p>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">Notes in, report out</h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Write your session notes once. Hayven turns them into the plain-language report the parent sees, no
                separate write-up.
              </p>
            </div>

            {/* -- dashboard/caseload -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="w-full max-w-[400px] rounded-xl bg-canvas-white p-4.5 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-ivory px-2 py-2.5 text-center">
                      <b className="block font-heading text-lg text-terracotta">3</b>
                      <span className="text-[0.62rem] text-ink-soft">Today</span>
                    </div>
                    <div className="rounded-lg bg-ivory px-2 py-2.5 text-center">
                      <b className="block font-heading text-lg text-terracotta">12</b>
                      <span className="text-[0.62rem] text-ink-soft">Active clients</span>
                    </div>
                    <div className="rounded-lg bg-ivory px-2 py-2.5 text-center">
                      <b className="block font-heading text-lg text-terracotta">2</b>
                      <span className="text-[0.62rem] text-ink-soft">Reports due</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-offwhite pt-2.5 text-[0.76rem] text-charcoal">
                    <span className="size-1.5 shrink-0 rounded-full bg-success" />
                    Zainab O. &middot; 3:00 PM &middot; Virtual
                  </div>
                  <div className="flex items-center gap-2 border-t border-offwhite pt-2.5 text-[0.76rem] text-charcoal">
                    <span className="size-1.5 shrink-0 rounded-full bg-success" />
                    Tobi A. &middot; 4:30 PM &middot; In-person
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">A dashboard that knows your day</h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Today&apos;s bookings, active clients, and what still needs a report, one screen, not five tabs.
              </p>
            </div>

            {/* -- verification -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="flex w-full max-w-[400px] items-center gap-3.5 rounded-xl bg-canvas-white p-5 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-success/10 text-2xl text-success-text">
                    &#10003;
                  </span>
                  <div>
                    <b className="block text-[0.88rem] text-charcoal">Hayven Verified</b>
                    <span className="text-[0.78rem] text-ink-soft">Cross-checked with your professional body</span>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">
                Verified once, trusted from day one
              </h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                We check your licence and credentials directly with your professional body, a real check, not a
                rubber stamp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-ivory px-6 py-24 md:px-10 md:py-[120px]">
        <div className="mx-auto max-w-[1320px]">
          <span className="flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.12em] text-terracotta uppercase">
            <span className="h-px w-6 bg-terracotta" />
            How it works
          </span>
          <h2 className="mt-3 max-w-[16ch] font-heading text-4xl leading-[1.05] font-medium text-charcoal sm:text-5xl">
            From application to your first booking
          </h2>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="reveal relative rounded-md border border-offwhite bg-canvas-white p-7 pt-8 shadow-[0_10px_26px_-14px_rgba(33,27,24,0.22)]"
                style={{ animationDelay: `${60 + i * 110}ms` }}
              >
                <span className="pointer-events-none absolute top-3.5 right-4.5 font-heading text-[2.6rem] leading-none font-medium text-terracotta/28 select-none">
                  0{i + 1}
                </span>
                <h4 className="mt-7 font-heading text-lg font-medium text-charcoal">{step.title}</h4>
                <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="bg-canvas-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-[800px]">
          <span className="flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.12em] text-terracotta uppercase">
            <span className="h-px w-6 bg-terracotta" />
            Questions therapists actually ask
          </span>
          <h2 className="mt-3 font-heading text-3xl leading-tight font-medium text-charcoal sm:text-4xl">
            Before you apply
          </h2>

          <div className="mt-8">
            {FAQS.map((item, i) => (
              <div key={item.q} className={`py-5.5 ${i < FAQS.length - 1 ? "border-b border-offwhite" : ""}`}>
                <b className="block font-heading text-base font-medium text-charcoal">{item.q}</b>
                <p className="mt-2 max-w-[60ch] text-[0.9rem] leading-relaxed text-ink-soft">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="bg-[linear-gradient(155deg,#2a211d_0%,#211b18_100%)] px-6 py-20 text-center md:px-10 md:py-24">
        <div className="mx-auto max-w-[44ch]">
          <h2 className="font-heading text-3xl font-medium text-canvas-white sm:text-4xl">
            Ready to see who&apos;s already looking?
          </h2>
          <p className="mt-3.5 text-[0.96rem] leading-relaxed text-canvas-white/70">
            Apply once. Verification usually takes a few days.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/signup?role=therapist"
              className="inline-flex h-[52px] items-center gap-2 rounded-full bg-terracotta px-7 text-[0.88rem] font-semibold text-canvas-white shadow-[0_10px_26px_-14px_rgba(156,89,52,0.6)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:bg-rust-dark"
            >
              Apply to join Hayven <IconArrowRight size={16} stroke={2} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
