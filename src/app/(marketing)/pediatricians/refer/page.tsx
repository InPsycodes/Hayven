import type { Metadata } from "next";
import { IconShieldCheck } from "@tabler/icons-react";

import { canonicalFor } from "@/lib/seo/metadata";
import { BrandMark } from "@/components/shared/brand-mark";
import { PediatricianReferralForm } from "@/components/marketing/pediatrician-referral-form";

export const metadata: Metadata = {
  title: "Refer a Child | Hayven",
  description: "Refer a child to Hayven's verified paediatric therapists -- no account required.",
  alternates: canonicalFor("/pediatricians/refer"),
};

const TIMELINE = [
  { title: "You submit", body: "Takes about a minute, no account needed" },
  { title: "We contact the family", body: "Usually within one business day" },
  { title: "You track it", body: "Reference code and your email, any time" },
];

export default function ReferChildPage() {
  return (
    <div className="md:grid md:h-dvh md:grid-cols-[5fr_7fr] md:overflow-hidden">
      <div className="flex flex-col justify-between gap-10 bg-charcoal px-8 py-12 text-offwhite md:px-14 md:py-14">
        <div>
          <BrandMark />
          <span className="label-micro mt-10 block text-rust-light">For pediatricians</span>
          <h1 className="mt-3 max-w-[14ch] font-heading text-3xl leading-tight text-offwhite md:text-[2.2rem]">
            What happens after you submit
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-offwhite/70">
            A short, honest timeline, not a black box. You&apos;ll get a reference code to check on it any time.
          </p>

          <ol className="mt-10 flex list-none flex-col">
            {TIMELINE.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span className="size-2 shrink-0 rounded-full bg-rust-light" />
                  {i < TIMELINE.length - 1 && <span className="my-1 w-px flex-1 bg-offwhite/15" />}
                </span>
                <div className="pb-7">
                  <b className="block text-sm text-offwhite">{step.title}</b>
                  <span className="text-[0.78rem] text-offwhite/55">{step.body}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center gap-2.5 border-t border-offwhite/15 pt-5 text-sm text-offwhite/55">
          <IconShieldCheck size={17} stroke={1.6} className="shrink-0" />
          No clinical detail is asked for or shared here.
        </div>
      </div>

      <div className="flex min-w-0 justify-center bg-paper px-6 py-16 md:h-full md:overflow-y-auto md:px-14 md:py-16">
        <PediatricianReferralForm />
      </div>
    </div>
  );
}
