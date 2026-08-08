import Image from "next/image";

import { cn } from "@/lib/utils";

/** Logo mark: Hayven H-glyph icon + wordmark. */
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
      <Image
        src="/images/logo-icon.png"
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0"
        priority
      />
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
