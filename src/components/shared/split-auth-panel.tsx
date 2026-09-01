import { IconCheck } from "@tabler/icons-react";

import { BrandMark } from "@/components/shared/brand-mark";

/**
 * Shared split-screen shell for login/signup: dark brand panel (~52%) +
 * form panel on a tan background (~48%). Renders as two direct children
 * meant to sit inside the (auth) route group's full-height flex row.
 *
 * The dark panel carries the brand, the tagline, an optional "what you
 * get" list and an optional quote -- so it reads as a reason to sign in,
 * not an empty void. Below md it collapses to a compact header (brand +
 * tagline only) so the form is reachable without scrolling past half a
 * screen of charcoal.
 */
export function SplitAuthPanel({
  progressLabel,
  eyebrow,
  tagline,
  subtext,
  points,
  quote,
  children,
}: {
  progressLabel?: string;
  eyebrow?: string;
  tagline: string;
  subtext?: string;
  points?: string[];
  quote?: { text: string; attribution: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex w-full flex-col gap-8 bg-charcoal px-8 py-9 text-offwhite md:w-[52%] md:justify-between md:gap-12 md:px-14 md:py-14">
        <div className="flex items-center justify-between">
          <BrandMark />
          {progressLabel && <span className="label-micro text-offwhite/50">{progressLabel}</span>}
        </div>

        <div className="flex flex-col gap-5 md:flex-1 md:justify-center">
          <div className="flex flex-col gap-3">
            {eyebrow && <span className="label-micro text-rust-light">{eyebrow}</span>}
            <h1 className="font-heading text-3xl leading-snug md:text-[2.5rem]">{tagline}</h1>
            {subtext && <p className="max-w-sm text-sm text-offwhite/70">{subtext}</p>}
          </div>

          {points && points.length > 0 && (
            <ul className="mt-2 hidden flex-col gap-3.5 md:flex">
              {points.map((point) => (
                <li key={point} className="flex max-w-sm items-start gap-3 text-sm text-offwhite/80">
                  <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-rust-light/20 text-rust-light">
                    <IconCheck size={12} stroke={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>

        {quote ? (
          <figure className="hidden border-t border-white/15 pt-6 md:block">
            <blockquote className="font-heading text-[15px] italic leading-relaxed text-offwhite/90">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <figcaption className="mt-2 text-xs text-offwhite/50">{quote.attribution}</figcaption>
          </figure>
        ) : (
          <div aria-hidden className="hidden md:block" />
        )}
      </div>

      <div className="flex w-full flex-1 items-start justify-center bg-paper px-6 py-10 md:w-[48%] md:items-center md:px-12">
        <div className="w-full max-w-sm rounded-2xl bg-canvas-white p-6 shadow-[0_1px_2px_rgba(26,26,26,.05),0_24px_50px_-30px_rgba(26,26,26,.35)] ring-1 ring-charcoal/10 sm:p-8">
          {children}
        </div>
      </div>
    </>
  );
}
