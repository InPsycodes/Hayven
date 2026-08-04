import Link from "next/link";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";

export function NeedsAttentionItem({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  subtitle: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-sm bg-white p-4">
      <Icon icon={icon} size="sm" className="mt-0.5 shrink-0 text-terracotta" />
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
