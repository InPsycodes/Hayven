import type { ReactNode } from "react";

/**
 * Shared cold-start rule for every chart on the child overview page: below
 * `minPoints`, never draw a line implying a trend that doesn't exist yet.
 * A single data point rendered as a chart is misinformation, not a rough edge.
 */
export function ChartFrame({
  title,
  pointCount,
  minPoints,
  emptyMessage,
  allowSinglePoint = false,
  children,
}: {
  title: string;
  pointCount: number;
  minPoints: number;
  emptyMessage?: string;
  /** PRD-specified exception: goal progress and attendance are meaningful even at 1 data point. */
  allowSinglePoint?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-sm bg-white p-5 ring-1 ring-border">
      <h3 className="text-sm font-medium text-charcoal">{title}</h3>

      {pointCount === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {emptyMessage ?? "No sessions recorded yet for this measure."}
        </p>
      ) : pointCount === 1 && !allowSinglePoint ? (
        <p className="mt-3 text-sm text-muted-foreground">
          One session recorded. Trends appear after 3 sessions.
        </p>
      ) : (
        <>
          <div className="mt-3">{children}</div>
          {pointCount < minPoints && (
            <p className="mt-2 text-xs text-muted-foreground">
              Based on {pointCount} sessions, early data.
            </p>
          )}
        </>
      )}
    </div>
  );
}
