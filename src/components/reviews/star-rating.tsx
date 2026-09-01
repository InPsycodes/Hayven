import { IconStarFilled } from "@tabler/icons-react";

/** Read-only star display. Supports fractional values (e.g. a 4.3 average). */
export function StarRating({
  value,
  size = 14,
  trackClassName = "text-border",
}: {
  value: number;
  size?: number;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = [0, 1, 2, 3, 4];
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size * 5 + 16, height: size }}
      role="img"
      aria-label={`${value} out of 5`}
    >
      <span className={`absolute inset-0 flex gap-0.5 ${trackClassName}`}>
        {stars.map((i) => (
          <IconStarFilled key={i} size={size} />
        ))}
      </span>
      <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber" style={{ width: `${pct}%` }}>
        {stars.map((i) => (
          <IconStarFilled key={i} size={size} className="shrink-0" />
        ))}
      </span>
    </span>
  );
}
