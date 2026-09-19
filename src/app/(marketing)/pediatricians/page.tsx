import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  IconChecklist,
  IconMailForward,
  IconUsers,
  IconShieldCheck,
  IconStethoscope,
  IconArrowRight,
  IconVideo,
} from "@tabler/icons-react";

import { canonicalFor } from "@/lib/seo/metadata";
import doctorImage from "../../../../public/images/pediatricians-doctor.jpg";
import parentChildImage from "../../../../public/images/pediatricians-parent-child.jpg";
import therapistImage from "../../../../public/images/pediatricians-therapist.jpg";

export const metadata: Metadata = {
  title: "For Pediatricians | Hayven",
  description: "Refer a child to Hayven's verified paediatric therapists in under a minute -- no account required.",
  alternates: canonicalFor("/pediatricians"),
};

const STEPS = [
  {
    icon: IconChecklist,
    title: "Submit the referral",
    body: "Child, parent contact, and what you're concerned about. That's the whole form.",
  },
  {
    icon: IconMailForward,
    title: "We contact the family",
    body: "Hayven reaches out to the parent directly. You're not chasing the follow-up.",
  },
  {
    icon: IconUsers,
    title: "You see it move",
    body: "Check status with your reference code: received, contacted, care started. No clinical detail, by design.",
  },
];

const REFERRAL_GUIDE = [
  { concern: "Speech delay, unclear speech, stuttering", consider: "Speech & language therapist" },
  { concern: "Motor delays, sensory sensitivities", consider: "Occupational therapist" },
  { concern: "Behavioral concerns, repetitive behaviors", consider: "ABA therapist" },
  { concern: "Multiple or unclear concerns", consider: "Developmental psychologist" },
];

export default function PediatriciansPage() {
  return (
    <div className="bg-canvas-white">
      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden bg-[radial-gradient(120%_100%_at_15%_0%,#2a211d_0%,#211b18_55%,#1c1714_100%)] py-20 md:flex md:min-h-[700px] md:items-center md:py-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-44 -right-36 size-[560px] rounded-[55%_45%_60%_40%/50%_55%_45%_50%] bg-[radial-gradient(circle_at_35%_30%,rgba(184,115,76,0.16),rgba(184,115,76,0.03)_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-40 -bottom-36 size-[380px] rounded-[55%_45%_60%_40%/50%_55%_45%_50%] bg-[radial-gradient(circle_at_60%_60%,rgba(217,161,126,0.12),transparent_70%)]"
        />

        <div className="relative z-[1] mx-auto grid w-full max-w-[1320px] gap-12 px-6 md:grid-cols-[5.4fr_6.6fr] md:items-center md:gap-10 md:px-10">
          <div>
            <span
              className="reveal inline-flex items-center gap-2 rounded-full border border-[rgba(217,161,126,0.4)] bg-[rgba(184,115,76,0.08)] px-4 py-2 text-[0.68rem] font-semibold tracking-[0.12em] text-rust-light uppercase"
              style={{ animationDelay: "100ms" }}
            >
              <span className="size-1.5 rounded-full bg-rust-light" />
              For pediatricians &amp; referring clinicians
            </span>

            <h1
              className="reveal mt-6 max-w-[12ch] font-heading text-[2.4rem] leading-[0.98] font-medium text-canvas-white sm:text-5xl lg:text-[4.2rem]"
              style={{ animationDelay: "220ms" }}
            >
              Refer a family <span className="text-rust-light">in under</span> a minute, not a phone tree.
            </h1>

            <p
              className="reveal mt-6 max-w-[34rem] text-[1.06rem] leading-relaxed text-canvas-white/72"
              style={{ animationDelay: "340ms" }}
            >
              No account, no portal login. Tell us what you&apos;re concerned about, we contact the family, and you
              can check status any time with your reference code.
            </p>

            <div className="reveal mt-9 flex flex-wrap gap-3.5" style={{ animationDelay: "460ms" }}>
              <Link
                href="/pediatricians/refer"
                className="inline-flex h-[52px] items-center gap-2 rounded-full bg-terracotta px-7 text-[0.88rem] font-semibold text-canvas-white shadow-[0_10px_26px_-14px_rgba(156,89,52,0.6)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:bg-rust-dark hover:shadow-[0_16px_30px_-14px_rgba(156,89,52,0.55)]"
              >
                Refer a child <IconArrowRight size={16} stroke={2} />
              </Link>
              <Link
                href="/pediatricians/status"
                className="inline-flex h-[52px] items-center gap-2 rounded-full border border-white/30 px-7 text-[0.88rem] font-semibold text-canvas-white transition-[transform,background-color,border-color] duration-200 ease-out hover:-translate-y-px hover:border-white/55 hover:bg-white/5"
              >
                Track an existing referral
              </Link>
            </div>
          </div>

          {/* ---- referral journey visual ---- */}
          <div
            className="pop-in relative h-[300px] overflow-hidden sm:h-[380px] sm:overflow-visible md:h-[500px]"
            style={{ animationDelay: "300ms" }}
          >
            <svg className="absolute inset-0 hidden size-full sm:block" viewBox="0 0 560 500" fill="none" aria-hidden>
              <path
                d="M 150 100 C 220 60, 300 60, 360 90"
                stroke="rgba(184,115,76,0.55)"
                strokeWidth="1.5"
                strokeDasharray="1 7"
                strokeLinecap="round"
              />
              <path
                d="M 210 260 C 270 300, 340 300, 400 260"
                stroke="rgba(184,115,76,0.55)"
                strokeWidth="1.5"
                strokeDasharray="1 7"
                strokeLinecap="round"
              />
              <circle cx="150" cy="100" r="4" fill="#b8734c" />
              <circle cx="360" cy="90" r="4" fill="#b8734c" />
              <circle cx="210" cy="260" r="4" fill="#b8734c" />
              <circle cx="400" cy="260" r="4" fill="#b8734c" />
            </svg>

            <div
              className="reveal absolute top-0 right-[6%] z-[2] w-[190px] rounded-2xl border border-white/60 bg-canvas-white p-4 shadow-[0_30px_70px_-30px_rgba(33,27,24,0.45)] sm:right-[18%] sm:w-[260px] sm:p-5 md:w-[320px] md:p-6"
              style={{ animationDelay: "800ms" }}
            >
              <div className="mb-3 flex items-center gap-2 border-b border-offwhite pb-3 sm:mb-4 sm:gap-2.5 sm:pb-4">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4f6146] text-[0.72rem] text-white sm:size-7 sm:text-[0.82rem]">
                  ✓
                </span>
                <div>
                  <b className="block text-[0.8rem] text-charcoal sm:text-[0.96rem]">Referral submitted</b>
                  <span className="text-[0.66rem] text-muted-foreground sm:text-[0.76rem]">Ref # HV-2487</span>
                </div>
              </div>
              <div className="flex items-center gap-2 py-1 text-[0.72rem] text-charcoal sm:py-1.5 sm:text-[0.84rem]">
                <span className="size-1.5 shrink-0 rounded-full bg-[#4f6146]" />
                Family contacted
                <span className="ml-auto text-[0.64rem] text-muted-foreground sm:text-[0.74rem]">2 min</span>
              </div>
              <div className="flex items-center gap-2 py-1 text-[0.72rem] text-charcoal sm:py-1.5 sm:text-[0.84rem]">
                <span className="size-1.5 shrink-0 rounded-full bg-[#4f6146]" />
                Appointment scheduled
                <span className="ml-auto text-[0.64rem] text-muted-foreground sm:text-[0.74rem]">1 day</span>
              </div>
              <div className="flex items-center gap-2 py-1 text-[0.72rem] text-muted-foreground sm:py-1.5 sm:text-[0.84rem]">
                <span className="size-1.5 shrink-0 rounded-full border border-offwhite" />
                In care
              </div>
            </div>

            <div className="absolute top-[2%] left-0 z-[3] size-[120px] overflow-hidden rounded-full border-2 border-white/5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.55)] sm:size-[170px] md:size-[210px]">
              <Image
                src={doctorImage}
                alt="Illustrated portrait of a referring pediatrician"
                fill
                placeholder="blur"
                sizes="(min-width: 768px) 210px, (min-width: 640px) 170px, 120px"
                className="scale-[1.25] object-cover"
              />
            </div>
            <div className="absolute bottom-[-2%] left-[16%] z-[4] size-[160px] overflow-hidden rounded-full border-2 border-white/5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.55)] sm:left-[22%] sm:size-[220px] md:size-[280px]">
              <Image
                src={parentChildImage}
                alt="Illustrated portrait of a parent and child"
                fill
                placeholder="blur"
                sizes="(min-width: 768px) 280px, (min-width: 640px) 220px, 160px"
                className="scale-[1.25] object-cover"
              />
            </div>
            <div className="absolute top-[6%] right-0 z-[3] size-[130px] overflow-hidden rounded-full border-2 border-white/5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.55)] sm:right-[-2%] sm:size-[190px] md:size-[236px]">
              <Image
                src={therapistImage}
                alt="Illustrated portrait of a Hayven care professional"
                fill
                placeholder="blur"
                sizes="(min-width: 768px) 236px, (min-width: 640px) 190px, 130px"
                className="scale-[1.25] object-cover"
              />
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
          <h2 className="mt-3 max-w-[14ch] font-heading text-4xl leading-[1.05] font-medium text-charcoal sm:text-5xl">
            Three steps, on your side
          </h2>

          <div className="relative mt-14 grid gap-7 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="reveal relative rounded-md border border-offwhite bg-canvas-white p-8 pt-9 shadow-[0_10px_26px_-14px_rgba(33,27,24,0.28)] transition-transform duration-200 ease-out hover:-translate-y-1"
                style={{ animationDelay: `${60 + i * 130}ms` }}
              >
                <span className="pointer-events-none absolute top-5 right-6 font-heading text-5xl leading-none font-medium text-terracotta/30 select-none">
                  0{i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-full bg-[#f1e4d6]">
                  <step.icon size={20} stroke={1.6} className="text-terracotta" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">{step.title}</h3>
                <p className="mt-2.5 max-w-[30ch] text-[0.92rem] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-2.5 border-t border-offwhite pt-7 text-[0.86rem] text-ink-soft">
            <IconShieldCheck size={17} stroke={1.6} className="shrink-0 text-terracotta" />
            No clinical detail is shared at referral stage.
          </div>
        </div>
      </section>

      {/* ================= THE HAYVEN WAY ================= */}
      <section className="bg-canvas-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div className="max-w-[60ch]">
            <span className="flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.12em] text-terracotta uppercase">
              <span className="h-px w-6 bg-terracotta" />
              The Hayven way
            </span>
            <h2 className="mt-3 font-heading text-3xl leading-tight font-medium text-charcoal sm:text-4xl">
              Care you can actually see moving
            </h2>
          </div>

          <div className="mt-11 grid gap-7 sm:grid-cols-2">
            {/* -- report excerpt -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="w-full max-w-[400px] overflow-hidden rounded-xl bg-canvas-white shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <div className="flex items-center gap-2.5 border-b border-offwhite px-4.5 py-4">
                    <span className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-[#f1e4d6] font-heading text-[0.74rem] font-bold text-terracotta">
                      AO
                    </span>
                    <div>
                      <b className="block text-[0.84rem] text-charcoal">Amara O., Speech Therapist</b>
                      <span className="text-[0.72rem] text-ink-soft">Session report &middot; Zainab, 4</span>
                    </div>
                  </div>
                  <div className="px-4.5 py-4 pb-5">
                    <p className="mb-1.5 text-[0.66rem] font-bold tracking-[0.06em] text-terracotta uppercase">
                      What went well
                    </p>
                    <p className="mb-2.5 rounded-lg bg-ivory/70 px-3.5 py-2.5 text-[0.84rem] leading-relaxed text-charcoal">
                      Zainab followed about two-thirds of instructions independently today, up from last session.
                    </p>
                    <p className="mb-1.5 text-[0.66rem] font-bold tracking-[0.06em] text-terracotta uppercase">
                      Practice at home
                    </p>
                    <p className="rounded-lg bg-ivory/70 px-3.5 py-2.5 text-[0.84rem] leading-relaxed text-charcoal">
                      10 minutes of naming objects during playtime, daily if possible.
                    </p>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">Reports built for busy families</h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Session notes turn into a plain-language report automatically. No clinical jargon, no separate
                write-up for the therapist.
              </p>
            </div>

            {/* -- progress chart -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="w-full max-w-[400px] rounded-xl bg-canvas-white p-5.5 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <span className="mb-2 inline-block rounded-full bg-success/10 px-2.5 py-0.5 text-[0.64rem] font-bold tracking-[0.06em] text-success-text uppercase">
                    Trending up
                  </span>
                  <h4 className="mb-3.5 text-[0.96rem] font-semibold text-charcoal">Communication</h4>
                  <svg viewBox="0 0 320 110" fill="none" className="block h-[110px] w-full">
                    <line x1="0" y1="90" x2="320" y2="90" stroke="#dcd3be" strokeWidth="1" />
                    <line x1="0" y1="55" x2="320" y2="55" stroke="#dcd3be" strokeWidth="1" />
                    <line x1="0" y1="20" x2="320" y2="20" stroke="#dcd3be" strokeWidth="1" />
                    <path
                      d="M0,85 C40,80 70,70 100,65 C140,58 170,50 200,38 C240,28 270,20 320,12"
                      stroke="#9c5934"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,85 C40,80 70,70 100,65 C140,58 170,50 200,38 C240,28 270,20 320,12 L320,110 L0,110 Z"
                      fill="#9c5934"
                      opacity="0.08"
                    />
                    <circle cx="320" cy="12" r="4" fill="#9c5934" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">Progress you can actually see</h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Every goal is tracked session to session, not just described. Parents see the same chart the
                therapist and supervisor do.
              </p>
            </div>

            {/* -- session format -- */}
            <div>
              <div className="flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="flex w-full max-w-[400px] items-center gap-3.5 rounded-xl bg-canvas-white p-5 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(155deg,#2a211d,#211b18)] text-rust-light">
                    <IconVideo size={26} stroke={1.6} />
                  </span>
                  <div>
                    <b className="block text-[0.88rem] text-charcoal">Amara O.</b>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#f1e4d6] px-2.5 py-0.5 text-[0.68rem] font-bold text-terracotta">
                      Virtual session
                    </span>
                    <div className="mt-1 text-[0.78rem] text-ink-soft">Tuesday, 3:00 PM</div>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">
                In-person or virtual, always verified
              </h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Families choose the format that works for them. Every therapist is verified the same way either
                way.
              </p>
            </div>

            {/* -- multi-child -- */}
            <div>
              <div className="relative flex min-h-[300px] items-start overflow-hidden rounded-2xl bg-offwhite p-9 pb-11">
                <div className="relative h-[190px] w-full">
                  <div className="absolute top-0 left-0 z-[1] w-[200px] rounded-[10px] border border-offwhite bg-canvas-white p-3.5 opacity-55 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                    <b className="block font-heading text-[1.05rem] text-charcoal">Sarah</b>
                    <span className="text-[0.74rem] text-ink-soft">Age 3</span>
                  </div>
                  <div className="absolute top-7 left-10 z-[2] w-[200px] rounded-[10px] border border-offwhite bg-canvas-white p-3.5 opacity-80 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                    <b className="block font-heading text-[1.05rem] text-charcoal">Tobi</b>
                    <span className="text-[0.74rem] text-ink-soft">Age 6</span>
                  </div>
                  <div className="absolute top-14 left-20 z-[3] w-[200px] rounded-[10px] border border-offwhite bg-canvas-white p-3.5 shadow-[0_20px_48px_-24px_rgba(40,28,12,0.28)]">
                    <b className="block font-heading text-[1.05rem] text-charcoal">Zainab</b>
                    <span className="text-[0.74rem] text-ink-soft">Age 4</span>
                    <div className="mt-2 flex items-center gap-1.5 border-t border-offwhite pt-2 text-[0.74rem] text-charcoal">
                      <span className="size-1.5 rounded-full bg-terracotta" />
                      Speech therapy &middot; Tuesday, 3:00 PM
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 font-heading text-xl font-medium text-charcoal">One dashboard, every child</h3>
              <p className="mt-2 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft">
                Switch between children without mixing their records. Each child&apos;s care team, reports, and
                progress stay entirely their own.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CLINICAL OVERSIGHT ================= */}
      <section className="bg-canvas-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-14 md:grid-cols-[0.95fr_1.05fr] md:items-start">
          <div>
            <span className="flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.12em] text-terracotta uppercase">
              <span className="h-px w-6 bg-terracotta" />
              Clinical oversight
            </span>
            <h2 className="mt-3 font-heading text-3xl leading-tight font-medium text-charcoal sm:text-4xl">
              Built around a real diagnostic background, not just a directory.
            </h2>
            <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink-soft">
              Hayven&apos;s verification model was shaped by someone who has actually done this work, not designed
              around it from the outside.
            </p>
          </div>

          <div>
            {[
              {
                icon: IconStethoscope,
                title: "Founded by a practicing diagnostician",
                body: "Hayven's clinical approach is shaped by its founder's own background as a diagnostician at a developmental psychology clinic, not a generalist product decision.",
              },
              {
                icon: IconShieldCheck,
                title: "Credentials checked directly, not self-reported",
                body: "Every therapist's licence and professional body membership is confirmed directly with that body before they're listed, the same standard the parent-facing side of Hayven already holds itself to.",
              },
              {
                icon: IconUsers,
                title: "You keep visibility, without carrying the case",
                body: "You see the referral move (contacted, assessment scheduled, care started) without needing to manage the follow-up yourself.",
              },
            ].map((detail, i) => (
              <div
                key={detail.title}
                className={`flex gap-4 py-5 ${i === 0 ? "border-t" : ""} border-b border-offwhite`}
              >
                <span className="w-6 shrink-0 font-heading text-lg text-rust-light">0{i + 1}</span>
                <div>
                  <h4 className="text-[0.92rem] font-semibold text-charcoal">{detail.title}</h4>
                  <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">{detail.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= REFERRAL GUIDE ================= */}
      <section className="bg-ivory px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div className="max-w-[46ch]">
            <span className="flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.12em] text-terracotta uppercase">
              <span className="h-px w-6 bg-terracotta" />
              Referral guide
            </span>
            <h2 className="mt-3 font-heading text-3xl leading-tight font-medium text-charcoal sm:text-4xl">
              What to refer, and to whom
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              A quick reference for the moment you&apos;re deciding whether, and where, to send a family. You
              don&apos;t need to know the answer before referring; this is just a starting point.
            </p>
          </div>

          <div className="mt-11 overflow-hidden rounded-[10px] border border-offwhite bg-canvas-white shadow-[0_10px_26px_-14px_rgba(33,27,24,0.28)]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-offwhite px-5 py-4 text-left text-[0.68rem] font-bold tracking-[0.08em] text-terracotta uppercase sm:px-7">
                    Presenting concern
                  </th>
                  <th className="border-b border-offwhite px-5 py-4 text-left text-[0.68rem] font-bold tracking-[0.08em] text-terracotta uppercase sm:px-7">
                    Consider
                  </th>
                </tr>
              </thead>
              <tbody>
                {REFERRAL_GUIDE.map((row, i) => (
                  <tr key={row.concern} className={i < REFERRAL_GUIDE.length - 1 ? "border-b border-offwhite" : ""}>
                    <td className="px-5 py-5 text-[0.94rem] font-medium text-charcoal sm:px-7">{row.concern}</td>
                    <td className="px-5 py-5 font-heading text-base font-semibold text-terracotta sm:px-7">
                      {row.consider}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-[0.84rem] text-ink-soft">
            Not sure yet? That&apos;s fine. The referral form doesn&apos;t require a specialty.
          </p>
        </div>
      </section>

      {/* ================= PARTNER CTA ================= */}
      <section className="bg-[linear-gradient(155deg,#2a211d_0%,#211b18_100%)] px-6 py-20 text-center md:px-10 md:py-24">
        <div className="mx-auto max-w-[44ch]">
          <h2 className="font-heading text-3xl font-medium text-canvas-white sm:text-4xl">
            Refer a family today, or build an ongoing relationship
          </h2>
          <p className="mt-3.5 text-[0.96rem] leading-relaxed text-canvas-white/70">
            Most clinicians start with a single referral. If your practice sees this often enough to want a standing
            relationship with Hayven, we&apos;d like to hear from you directly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Link
              href="/pediatricians/refer"
              className="inline-flex h-[52px] items-center gap-2 rounded-full bg-terracotta px-7 text-[0.88rem] font-semibold text-canvas-white shadow-[0_10px_26px_-14px_rgba(156,89,52,0.6)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:bg-rust-dark"
            >
              Refer a child <IconArrowRight size={16} stroke={2} />
            </Link>
            <a
              href="mailto:hayvenmind@gmail.com?subject=Partnering%20with%20Hayven"
              className="inline-flex h-[52px] items-center gap-2 rounded-full border border-white/30 px-7 text-[0.88rem] font-semibold text-canvas-white transition-[transform,background-color,border-color] duration-200 ease-out hover:-translate-y-px hover:border-white/55 hover:bg-white/5"
            >
              Partner with Hayven
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
