import { cn } from "@/lib/utils";

/** Warm-dark background wrapper for a dashboard page. */
export function CareShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-full bg-care-bg px-5 pb-16 pt-5 text-care-ink md:px-8 md:pb-20", className)}>
      <div className="mx-auto max-w-[1180px]">{children}</div>
    </div>
  );
}
