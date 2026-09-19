import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  urgent,
  emphasis,
}: {
  label: string;
  value: string;
  urgent?: boolean;
  /** Bigger serif figure, for the one number on a page that deserves top billing. */
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-card p-[18px] ring-1 ring-border">
      <span className="label-micro text-muted-foreground">{label}</span>
      <p
        className={cn(
          "mt-1.5 truncate font-medium",
          emphasis ? "font-heading text-3xl font-semibold" : "text-2xl",
          urgent ? "text-terracotta" : "text-charcoal"
        )}
      >
        {value}
      </p>
    </div>
  );
}
