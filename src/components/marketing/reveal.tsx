"use client";

import type { CSSProperties, ReactNode } from "react";

import { useReveal } from "./use-reveal";

/**
 * Client wrapper so server-rendered sections can still get the
 * scroll-into-view rise animation without becoming client components
 * themselves. Pass `delayMs` to stagger a group of these (e.g. cards in a
 * grid revealing one after another instead of all at once).
 */
export function Reveal({
  children,
  className,
  delayMs,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useReveal<HTMLDivElement>();
  const style: CSSProperties | undefined =
    delayMs != null ? { animationDelay: `${delayMs}ms` } : undefined;
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
