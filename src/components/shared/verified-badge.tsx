import { IconShieldCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function VerifiedBadge({
  label = "Verified",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-terracotta/10 px-2.5 py-1 text-[11px] font-medium text-terracotta",
        className
      )}
    >
      <IconShieldCheck size={13} stroke={2} />
      {label}
    </span>
  );
}
