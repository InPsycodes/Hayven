import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  urgent,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-sm bg-paper p-[18px]">
      <span className="label-micro text-muted-foreground">{label}</span>
      <p className={cn("mt-1.5 text-2xl font-medium", urgent ? "text-terracotta" : "text-charcoal")}>
        {value}
      </p>
    </div>
  );
}
