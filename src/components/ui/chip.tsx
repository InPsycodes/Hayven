import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        outline: "border-border bg-transparent text-foreground",
        filled: "border-transparent bg-charcoal text-white",
        accent: "border-transparent bg-terracotta text-white",
        tan: "border-transparent bg-paper text-charcoal",
        // Darker than the base terracotta token: the tinted background here
        // reads lighter than a solid surface, so the base tone falls short
        // of 4.5:1 at this size -- see status-badge.tsx for the same fix.
        soft: "border-transparent bg-terracotta/10 text-rust-dark",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void;
}

function Chip({ className, variant, onRemove, children, ...props }: ChipProps) {
  return (
    <span data-slot="chip" className={cn(chipVariants({ variant }), className)} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="-mr-1 rounded-full p-0.5 hover:bg-black/10"
        >
          <IconX size={12} stroke={2.5} />
        </button>
      )}
    </span>
  );
}

export { Chip, chipVariants };
