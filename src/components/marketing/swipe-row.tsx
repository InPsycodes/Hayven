"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A card row that swipes sideways on phones and is an ordinary grid from
 * the `sm` breakpoint up. Below `sm`, cards stacked vertically made the
 * marketing pages very long on a phone (the home page ran to ~12,000px);
 * here each card takes 80% of the width so the next one visibly peeks in,
 * and native CSS scroll-snap gives the browser's own momentum and snapping.
 * No animation library: the only JS is the position dots.
 *
 * `gridClassName` is the desktop layout, written with `sm:`/`lg:` prefixes
 * (e.g. "sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"). `bleedClassName`
 * pulls the row out to the screen edges on phones to match the section's
 * own side padding (e.g. "-mx-6 px-6 scroll-px-6" inside a px-6 section).
 */
export function SwipeRow({
  children,
  label,
  className,
  gridClassName,
  bleedClassName = "-mx-6 px-6 scroll-px-6",
  itemClassName,
  tone = "light",
}: {
  children: ReactNode;
  /** Accessible name for the scrollable region, e.g. "Therapy types". */
  label: string;
  className?: string;
  gridClassName: string;
  bleedClassName?: string;
  itemClassName?: string;
  tone?: "light" | "dark";
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards = row.children;
        if (cards.length < 2) return;
        const step = (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
        if (step <= 0) return; // grid layout (sm and up): cards aren't in a row
        const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
        setActive(atEnd ? cards.length - 1 : Math.round(row.scrollLeft / step));
      });
    };
    row.addEventListener("scroll", update, { passive: true });
    return () => {
      row.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={className}>
      <div
        ref={rowRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          // Phones: a snapping row. overscroll-x-contain stops a hard swipe
          // at the end from triggering the browser's back gesture.
          "flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta",
          bleedClassName,
          // sm and up: hand layout back to the section's grid.
          "sm:mx-0 sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0",
          gridClassName
        )}
      >
        {items.map((child, i) => (
          <div key={i} className={cn("w-[80%] shrink-0 snap-start sm:w-auto", itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div aria-hidden className="mt-4 flex justify-center gap-1.5 sm:hidden">
          {items.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-200 ease-(--ease-out) motion-reduce:transition-none",
                i === active
                  ? cn("w-[18px]", tone === "dark" ? "bg-rust-light" : "bg-terracotta")
                  : cn("w-1.5", tone === "dark" ? "bg-canvas-white/25" : "bg-charcoal/20")
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
