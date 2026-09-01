import { IconAlertCircle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * Inline, per-field validation message. Render it right under the input and
 * point the input's `aria-describedby` at `${id}` (and set
 * `aria-invalid`) so the pairing is announced. Renders nothing when there's
 * no message, so it's safe to leave mounted.
 */
export function FieldError({
  id,
  children,
  className,
}: {
  id: string;
  children?: string | null;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} className={cn("flex items-start gap-1 text-xs text-error-text", className)}>
      <IconAlertCircle size={13} stroke={2} aria-hidden className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}
