import Link from "next/link";
import { IconArrowRight, IconShieldCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { formatNaira, initialsFromName } from "@/data/format";
import { StarRating } from "@/components/reviews/star-rating";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";

// Initials tile tints, tuned to read on the charcoal card. Picked by a hash
// of the name so a given therapist always gets the same one.
const AVATAR_TINTS = [
  "bg-[rgba(184,115,76,0.24)] text-[#e7b590]",
  "bg-[rgba(147,163,127,0.24)] text-[#bdccad]",
  "bg-[rgba(158,142,183,0.2)] text-[#c9bdda]",
  "bg-white/10 text-canvas-white",
];

function tintFor(name: string): string {
  // FNV-1a — spreads short, similar strings across the buckets far better
  // than a plain polynomial hash (the demo names all start "Dr. ...").
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return AVATAR_TINTS[(hash >>> 0) % AVATAR_TINTS.length];
}

function sessionTypeLabel(types: string[]): string | null {
  const inPerson = types.includes("in_person");
  const virtual = types.includes("virtual");
  if (inPerson && virtual) return "In-person & virtual";
  if (virtual) return "Virtual";
  if (inPerson) return "In-person";
  return null;
}

/** ["3-6","7-12","13-17"] -> "Ages 3–17". Only mock profiles carry age groups today. */
function ageLabel(groups: string[]): string | null {
  const nums = groups.flatMap((g) => g.split("-").map(Number)).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return lo === hi ? `Ages ${lo}` : `Ages ${lo}–${hi}`;
}

export function TherapistResultRow({ therapist }: { therapist: DiscoveryTherapist }) {
  const [primarySpecialty, ...otherSpecialties] = therapist.specialtyNames;

  const chips: string[] = [];
  const session = sessionTypeLabel(therapist.sessionTypes);
  if (session) chips.push(session);
  const ages = ageLabel(therapist.ageGroupsServed);
  if (ages) chips.push(ages);
  for (const specialty of otherSpecialties) {
    if (chips.length < 3) chips.push(specialty);
  }

  const metaLine = [
    primarySpecialty,
    therapist.location,
    therapist.yearsPracticing ? `${therapist.yearsPracticing} yrs experience` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const bio = therapist.bio?.trim();

  return (
    <Link
      href={`/therapists/${therapist.id}`}
      className="group grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 rounded-2xl bg-charcoal p-4 text-canvas-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_22px_46px_-26px_rgba(26,18,12,0.55)] ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:ring-white/20 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-x-5 sm:p-5"
    >
      <span
        className={cn(
          "flex size-13 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ring-1 ring-inset ring-white/15",
          tintFor(therapist.displayName)
        )}
      >
        {initialsFromName(therapist.displayName)}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="font-serif text-base font-medium text-canvas-white sm:text-lg">
            {therapist.displayName}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-terracotta/20 px-2 py-0.5 text-[10px] font-semibold text-[#e2ac83]">
            <IconShieldCheck size={11} stroke={2} />
            Verified
          </span>
        </div>

        {metaLine && <p className="mt-0.5 text-xs text-canvas-white/60">{metaLine}</p>}

        {therapist.rating.count > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-canvas-white/70">
            <StarRating value={therapist.rating.average} size={12} trackClassName="text-white/20" />
            <span className="font-medium text-canvas-white/90">{therapist.rating.average.toFixed(1)}</span>
            <span className="text-canvas-white/45">
              ({therapist.rating.count} review{therapist.rating.count === 1 ? "" : "s"})
            </span>
          </p>
        )}

        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-white/[0.07] px-2 py-0.5 text-[10.5px] text-canvas-white/75"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {bio && <p className="mt-2 line-clamp-1 text-xs text-canvas-white/50">{bio}</p>}
      </div>

      <div className="col-span-2 flex items-center justify-between gap-4 border-t border-white/10 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-2.5 sm:border-0 sm:pt-0 sm:text-right">
        <div>
          <span className="block font-serif text-[17px] font-medium text-canvas-white">
            {formatNaira(therapist.pricePerSession)}
          </span>
          <span className="text-[10px] text-canvas-white/50">per session</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold whitespace-nowrap text-white transition-colors group-hover:bg-rust-dark">
          View profile
          <IconArrowRight
            size={12}
            stroke={2}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
