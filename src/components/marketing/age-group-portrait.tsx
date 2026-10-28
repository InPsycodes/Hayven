import Image from "next/image";

import { Icon } from "@/components/ui/icon";
import type { AgeGroup } from "@/content/marketing/age-groups";
import { cn } from "@/lib/utils";

/** An age group's photo, or a brand-toned stand-in for groups without photography yet. Size and shape come from className. */
export function AgeGroupPortrait({
  group,
  sizes,
  className,
  priority,
  zoom,
}: {
  group: AgeGroup;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Scales the photo up around its focal point, for small crops where a wide scene would leave faces tiny. */
  zoom?: number;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden", className)}>
      {group.image ? (
        <Image
          src={group.image.src}
          alt={group.image.alt}
          fill
          placeholder="blur"
          priority={priority}
          sizes={sizes}
          className="photo-treatment object-cover"
          style={{
            objectPosition: group.image.position,
            ...(zoom ? { transform: `scale(${zoom})`, transformOrigin: group.image.position } : {}),
          }}
        />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-center justify-center text-canvas-white"
          style={{ background: "linear-gradient(135deg, #9c5934 0%, #dcd3be 100%)" }}
        >
          <Icon icon={group.fallbackIcon} size="lg" className="size-[28%]" />
        </div>
      )}
    </div>
  );
}
