"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
}

/**
 * Mobile nav for the supervisor portal -- a bottom tab bar like the
 * parent/therapist apps, not the staff hamburger drawer. The supervisor
 * portal only has 3-4 destinations, so they all fit. (Admin keeps the
 * drawer -- it has far too many sections for a tab bar.)
 */
export function SupervisorBottomNav({ items }: { items: Tab[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/50 bg-[linear-gradient(180deg,rgba(250,248,246,0.82)_0%,rgba(250,248,246,0.94)_100%)] px-1 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_-10px_30px_-16px_rgba(26,18,12,0.3)] backdrop-blur-2xl backdrop-saturate-150 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded px-2 py-1 text-[10px]",
              active ? "text-terracotta" : "text-muted-foreground"
            )}
          >
            <Icon icon={item.icon} size="sm" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
