import { formatNaira } from "@/data/format";

/**
 * A small two-series area/line chart for the therapist dashboard (monthly
 * earnings + session count). Server-rendered SVG, each series normalised to
 * its own max so both curves are readable regardless of scale.
 */
export function CareAreaChart({
  data,
}: {
  data: { label: string; earnings: number; sessions: number }[];
}) {
  const W = 640;
  const H = 200;
  const n = data.length;
  if (n < 2) {
    return (
      <p className="mt-6 py-8 text-center text-sm text-care-ink-faint">
        Not enough history yet — this fills in as sessions are logged.
      </p>
    );
  }

  const maxE = Math.max(1, ...data.map((d) => d.earnings));
  const maxS = Math.max(1, ...data.map((d) => d.sessions));
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number, max: number) => H - (v / max) * (H - 12) - 4;

  const line = (pts: [number, number][]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  const ePts = data.map((d, i) => [x(i), y(d.earnings, maxE)] as [number, number]);
  const sPts = data.map((d, i) => [x(i), y(d.sessions, maxS)] as [number, number]);
  const eArea = `${line(ePts)} L${W} ${H} L0 ${H} Z`;

  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-end gap-4 text-[11px] text-care-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2.5px] w-3.5 rounded-full bg-care-green" />
          Sessions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2.5px] w-3.5 rounded-full bg-care-accent" />
          Earnings
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="176" preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="care-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-care-green)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-care-green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={4 + f * (H - 16)}
            y2={4 + f * (H - 16)}
            stroke="var(--color-care-line)"
          />
        ))}
        <path d={`${line(sPts)} L${W} ${H} L0 ${H} Z`} fill="url(#care-area)" />
        <path d={line(ePts)} fill="none" stroke="var(--color-care-accent)" strokeWidth="2" />
        <path d={line(sPts)} fill="none" stroke="var(--color-care-green)" strokeWidth="2" />
        <path d={eArea} fill="none" />
        <circle
          cx={ePts[n - 1][0]}
          cy={ePts[n - 1][1]}
          r="4"
          fill="var(--color-care-accent)"
          style={{ filter: "drop-shadow(0 0 6px var(--color-care-accent))" }}
        />
        <circle
          cx={sPts[n - 1][0]}
          cy={sPts[n - 1][1]}
          r="4"
          fill="var(--color-care-green)"
          style={{ filter: "drop-shadow(0 0 6px var(--color-care-green))" }}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-care-ink-faint">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-care-ink-faint">
        {formatNaira(data[n - 1].earnings)} this month · {data[n - 1].sessions} sessions
      </p>
    </div>
  );
}
