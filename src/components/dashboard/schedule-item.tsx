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
        "flex items-center gap-4 py-4",
        isNext && "-ml-4 border-l-[3px] border-l-terracotta pl-3.5"
      )}
    >
      <div className="w-16 shrink-0 text-right">
        <p className="font-heading text-lg font-semibold text-charcoal">{formatTime(startTime)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal">{clientName}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {sessionType} · {format}
        </p>
      </div>
    </div>
  );
}
