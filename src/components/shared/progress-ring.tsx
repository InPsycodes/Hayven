import { cn } from "@/lib/utils";

/**
 * Circular progress indicator -- the Learning Center's "how far through" cue
 * on the therapist courses overview and the course header. Decorative; the
 * numeric progress is always stated in text alongside it.
 */
export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  className,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-charcoal/12"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="stroke-terracotta transition-[stroke-dashoffset] duration-500"
        />
      </g>
    </svg>
  );
}
