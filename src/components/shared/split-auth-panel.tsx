import { BrandMark } from "@/components/shared/brand-mark";

/**
 * Shared split-screen shell for login/signup: dark brand panel (~55%) +
 * form panel on a tan background (~45%). Renders as two direct children
 * meant to sit inside the (auth) route group's full-height flex row.
 */
export function SplitAuthPanel({
  progressLabel,
  eyebrow,
  tagline,
  subtext,
  children,
}: {
  progressLabel?: string;
  eyebrow?: string;
  tagline: string;
  subtext?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex w-full flex-col justify-between gap-10 bg-charcoal px-8 py-10 text-offwhite md:w-[55%] md:px-14 md:py-14">
        <div className="flex items-center justify-between">
          <BrandMark />
          {progressLabel && (
            <span className="label-micro text-offwhite/50">{progressLabel}</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {eyebrow && <span className="label-micro text-terracotta">{eyebrow}</span>}
          <h1 className="font-heading text-3xl leading-snug md:text-4xl">{tagline}</h1>
          {subtext && <p className="max-w-sm text-sm text-offwhite/70">{subtext}</p>}
        </div>
        <div aria-hidden />
      </div>
      <div className="flex w-full flex-1 items-center justify-center bg-paper px-6 py-10 md:w-[45%] md:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </>
  );
}
