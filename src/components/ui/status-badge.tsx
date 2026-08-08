import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Small status pill -- sage (on track/calm), amber (needs attention), rust (brand/highlight), error (rejected/failed), grey (neutral). */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        sage: "bg-success/10 text-success",
        amber: "bg-amber/10 text-amber",
        rust: "bg-terracotta/10 text-terracotta",
        error: "bg-error/10 text-error",
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
