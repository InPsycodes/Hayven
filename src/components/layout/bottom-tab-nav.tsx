"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { AppSession } from "@/lib/auth/session";
import { BOTTOM_TABS } from "./nav-config";

export function BottomTabNav({ session }: { session: AppSession }) {
  const pathname = usePathname();
  const role = session.role as "parent" | "therapist";
  const items = BOTTOM_TABS[role];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card px-1 py-1.5 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
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
