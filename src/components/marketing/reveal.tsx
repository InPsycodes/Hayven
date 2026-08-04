"use client";

import type { ReactNode } from "react";

import { useReveal } from "./use-reveal";

/**
 * Client wrapper so server-rendered sections can still get the
 * scroll-into-view rise animation without becoming client components
 * themselves.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
