import { cn } from "@/lib/utils";

/** Pulsing placeholder block for loading.tsx route fallbacks -- never used for interactive content. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm bg-charcoal/8", className)}
      {...props}
    />
  );
}

export { Skeleton };
