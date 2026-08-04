import Link from "next/link";
import { IconX } from "@tabler/icons-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

export function StepHeader({
  title,
  subtitle,
  step,
  totalSteps,
  closeHref,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  closeHref?: string;
  eyebrow?: string;
}) {
  return (
    <div className="bg-charcoal px-6 py-6 text-offwhite md:px-8 md:py-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandMark compact />
          {eyebrow && <span className="label-micro text-offwhite/50">{eyebrow}</span>}
        </div>
        {closeHref && (
          <Link
            href={closeHref}
            aria-label="Close"
            className="text-offwhite/60 hover:text-offwhite"
          >
            <IconX size={18} />
          </Link>
        )}
      </div>
      <h1 className="mt-5 font-heading text-xl">{title}</h1>
      <p className="mt-1 text-xs text-offwhite/60">{subtitle}</p>
      {totalSteps > 1 && (
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i < step ? "bg-terracotta" : "bg-white/15"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
