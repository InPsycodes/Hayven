import type { Metadata } from "next";
import Link from "next/link";
import { IconStethoscope, IconMailForward, IconChecklist } from "@tabler/icons-react";

import { canonicalFor } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "For Pediatricians | Hayven",
  description: "Refer a child to Hayven's verified paediatric therapists in under a minute -- no account required.",
  alternates: canonicalFor("/pediatricians"),
};

export default function PediatriciansPage() {
  return (
    <div className="bg-canvas-white">
      <section className="bg-[linear-gradient(155deg,var(--charcoal)_0%,#2b2118_100%)] px-6 py-16 text-canvas-white md:px-10 md:py-24">
        <div className="mx-auto max-w-2xl">
          <span className="label-micro inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-rust-light">
            For pediatricians &amp; referring clinicians
          </span>
          <h1 className="mt-5 font-heading text-3xl leading-tight sm:text-4xl">
            Refer a family in under a minute, not a phone tree.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-canvas-white/78">
            No account, no portal login. Tell us what you&apos;re concerned about, we contact the family, and you can
            check status any time with your reference code.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pediatricians/refer"
              className="rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
            >
              Refer a child &rarr;
            </Link>
            <Link
              href="/pediatricians/status"
              className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-canvas-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Track an existing referral
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <span className="label-micro text-rust-dark">How it works</span>
          <h2 className="mt-2 font-heading text-2xl text-charcoal">Three steps, on your side</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <div className="rounded-sm bg-offwhite/60 p-5">
              <IconChecklist size={22} stroke={1.75} className="text-terracotta" />
              <h3 className="mt-3 text-sm font-semibold text-charcoal">Submit the referral</h3>
              <p className="mt-1.5 text-sm text-ink-soft">
                Child, parent contact, and what you&apos;re concerned about &mdash; that&apos;s the whole form.
              </p>
            </div>
            <div className="rounded-sm bg-offwhite/60 p-5">
              <IconMailForward size={22} stroke={1.75} className="text-terracotta" />
              <h3 className="mt-3 text-sm font-semibold text-charcoal">We contact the family</h3>
              <p className="mt-1.5 text-sm text-ink-soft">
                Hayven reaches out to the parent directly. You&apos;re not chasing the follow-up.
              </p>
            </div>
            <div className="rounded-sm bg-offwhite/60 p-5">
              <IconStethoscope size={22} stroke={1.75} className="text-terracotta" />
              <h3 className="mt-3 text-sm font-semibold text-charcoal">You see it move</h3>
              <p className="mt-1.5 text-sm text-ink-soft">
                Check status with your reference code &mdash; received, contacted, care started. No clinical
                detail, by design.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-charcoal px-6 py-16 text-center text-canvas-white md:px-10">
        <div className="mx-auto max-w-md">
          <h2 className="font-heading text-2xl">Have a family in mind right now?</h2>
          <p className="mt-2 text-sm text-canvas-white/70">Takes about a minute. No account required.</p>
          <Link
            href="/pediatricians/refer"
            className="mt-6 inline-block rounded-full bg-terracotta px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
          >
            Refer a child
          </Link>
        </div>
      </section>
    </div>
  );
}
