import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

/**
 * Shared "what next" band that closes Learning Center pages so a reader is
 * always routed onward -- the quiz, or a therapist. `tone="dark"` is the
 * charcoal treatment used at the foot of an article; `"light"` is the
 * terracotta-wash treatment used on the /learn index.
 */
export function LearnCta({
  heading,
  body,
  primary,
  secondary,
  tone = "light",
}: {
  heading: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={`flex flex-col gap-4 rounded-[1.25rem] p-6 sm:flex-row sm:items-center sm:justify-between md:p-8 ${
        dark
          ? "bg-charcoal text-canvas-white"
          : "border border-terracotta/25 bg-terracotta/8 text-charcoal"
      }`}
    >
      <div className="sm:max-w-md">
        <h3 className={`font-serif text-lg ${dark ? "text-canvas-white" : "text-charcoal"}`}>
          {heading}
        </h3>
        <p className={`mt-1.5 text-sm leading-relaxed ${dark ? "text-canvas-white/70" : "text-ink-soft"}`}>
          {body}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2.5">
        <Link
          href={primary.href}
          className="group inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-canvas-white transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-rust-dark"
        >
          {primary.label}
          <IconArrowRight
            size={15}
            stroke={2}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        {secondary && (
          <Link
            href={secondary.href}
            className={`inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
              dark
                ? "border-white/25 text-canvas-white hover:bg-white/10"
                : "border-rust-dark/40 text-rust-dark hover:bg-rust-dark hover:text-canvas-white"
            }`}
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
