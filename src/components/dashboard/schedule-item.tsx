import { cn } from "@/lib/utils";
import { formatTime } from "@/data/format";

export function ScheduleItem({
  clientName,
  sessionType,
  format,
  startTime,
  isNext,
}: {
  clientName: string;
  sessionType: string;
  format: string;
  startTime: string;
  isNext: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-sm border-l-[3px] bg-white p-4",
        isNext ? "border-l-terracotta" : "border-l-paper"
      )}
    >
      <div>
        <p className="text-sm font-medium text-charcoal">{clientName}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {sessionType} · {format}
        </p>
      </div>
      <span className="text-sm text-charcoal">{formatTime(startTime)}</span>
    </div>
  );
}
