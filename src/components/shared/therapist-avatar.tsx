import Image from "next/image";

import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";

/**
 * A therapist's photo (public `avatars` bucket) with an initials tile as the
 * fallback when they haven't uploaded one. `fallbackClassName` styles only
 * the initials tile; `className` applies to both so a ring/shadow is shared.
 */
export function TherapistAvatar({
  name,
  photoUrl,
  size,
  className,
  fallbackClassName,
}: {
  name: string;
  photoUrl: string | null;
  size: number;
  className?: string;
  fallbackClassName?: string;
}) {
  if (photoUrl) {
    return (
      <span
        className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
        style={{ width: size, height: size }}
      >
        <Image src={photoUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        fallbackClassName ?? "bg-muted text-muted-foreground",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsFromName(name)}
    </span>
  );
}
