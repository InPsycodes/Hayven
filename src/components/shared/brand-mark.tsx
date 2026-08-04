import { IconLeaf } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/** Logo mark: terracotta leaf glyph + wordmark, per the PWA mockup spec. */
export function BrandMark({
  compact = false,
  dark = true,
  className,
}: {
  compact?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-terracotta text-white">
        <IconLeaf size={16} stroke={2} />
      </span>
      {!compact && (
        <span
          className={cn(
            "label-micro",
            dark ? "text-offwhite" : "text-charcoal"
          )}
        >
          Hayven
        </span>
      )}
    </div>
  );
}
