import { formatNaira, initialsFromName } from "@/data/format";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";

export function TherapistRecapCard({ therapist }: { therapist: DiscoveryTherapist }) {
  return (
    <div className="flex items-center gap-3 rounded-sm bg-paper p-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-charcoal">
        {initialsFromName(therapist.displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{therapist.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {therapist.specialtyNames[0]}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-charcoal">
        {formatNaira(therapist.pricePerSession)}
      </span>
    </div>
  );
}
