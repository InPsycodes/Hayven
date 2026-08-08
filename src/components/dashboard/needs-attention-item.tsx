import Link from "next/link";

import { cn } from "@/lib/utils";

const DOT_TONE = {
  amber: "bg-amber",
  rust: "bg-terracotta",
  sage: "bg-success",
} as const;

export function NeedsAttentionItem({
  tone = "rust",
  title,
  subtitle,
  href,
}: {
  tone?: keyof typeof DOT_TONE;
  title: string;
  subtitle: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 py-3">
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", DOT_TONE[tone])} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}
