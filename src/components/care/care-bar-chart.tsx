import { cn } from "@/lib/utils";

/**
 * A compact weekly bar chart (attendance). Pure CSS bars, no SVG -- the
 * data is small and the shape is simple. `missed` weeks are tinted amber,
 * the current week accent, the rest a muted fill scaled to the busiest week.
 */
export function CareBarChart({
  data,
}: {
  data: { weekStart: string; attended: number; missed: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.attended + d.missed));
  return (
    <div className="mt-3.5 flex h-[92px] items-end gap-[5px]">
      {data.map((d, i) => {
        const total = d.attended + d.missed;
        const isLast = i === data.length - 1;
        return (
          <span
            key={d.weekStart}
            title={`Week of ${d.weekStart}: ${d.attended} attended${d.missed ? `, ${d.missed} missed` : ""}`}
            className={cn(
              "min-h-[3px] flex-1 rounded-t-[3px]",
              d.missed > 0
                ? "bg-care-amber/70"
                : isLast
                  ? "bg-care-accent"
                  : total > 0
                    ? "bg-care-green/70"
                    : "bg-care-ink-faint/25"
            )}
            style={{ height: `${total === 0 ? 8 : Math.round((total / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
