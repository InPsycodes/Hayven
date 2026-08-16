import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Small status pill -- sage (on track/calm), amber (needs attention), rust
 * (brand/highlight), error (rejected/failed), grey (neutral).
 *
 * Text colors here are deliberately darker than the base tone tokens: the
 * badge's own tint background makes the *effective* backdrop lighter than
 * whatever surface it sits on, so the base tone (tuned for text-on-solid-
 * surface contexts) falls short of 4.5:1 at this badge's small (11px) text
 * size. These are re-tuned specifically for that tinted-background case.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        sage: "bg-success/10 text-[#4a5540]",
        amber: "bg-amber/10 text-[#6f4519]",
        rust: "bg-terracotta/10 text-rust-dark",
        error: "bg-error/10 text-[#8f2e24]",
        grey: "bg-charcoal/6 text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "grey",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, tone, children, ...props }: StatusBadgeProps) {
  return (
    <span data-slot="status-badge" className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
