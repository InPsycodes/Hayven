import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { formatNaira, initialsFromName } from "@/data/format";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";

export function TherapistResultRow({ therapist }: { therapist: DiscoveryTherapist }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border py-5 last:border-0 sm:flex-row sm:items-center">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-medium text-charcoal">
        {initialsFromName(therapist.displayName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base text-charcoal">{therapist.displayName}</h3>
          <VerifiedBadge />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {therapist.specialtyNames.join(", ")} · {therapist.location} ·{" "}
          {therapist.yearsPracticing} yrs experience
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {therapist.specialtyNames.slice(0, 2).map((name) => (
            <Chip key={name} variant="outline">
              {name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
        <div className="sm:text-right">
          <span className="text-lg font-medium text-charcoal">
            {formatNaira(therapist.pricePerSession)}
          </span>
          <span className="block text-[11px] text-muted-foreground">per session</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/therapists/${therapist.id}`}>View profile</Link>
        </Button>
      </div>
    </div>
  );
}
