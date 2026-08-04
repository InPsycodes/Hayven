"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/shared/brand-mark";
import { LogoutButton } from "@/components/shared/logout-button";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";
import { SIDEBAR_NAV } from "./nav-config";

export function SidebarNav({ session }: { session: AppSession }) {
  const pathname = usePathname();
  const role = session.role as "parent" | "therapist";
  const items = SIDEBAR_NAV[role];

  return (
    <aside className="hidden w-56 shrink-0 flex-col justify-between bg-charcoal px-5 py-8 md:flex">
      <div className="flex flex-col gap-8">
        <BrandMark />
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-[#26221A] text-offwhite"
                    : "text-[#8A8479] hover:text-offwhite"
                )}
              >
                <Icon
                  icon={item.icon}
                  size="sm"
                  className={active ? "text-terracotta" : ""}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-xs font-medium text-white">
            {initialsFromName(session.name)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-offwhite">
              {session.name}
            </span>
            <span className="label-micro text-[#8A8479]">{role} account</span>
          </div>
        </div>
        <LogoutButton className="text-[#8A8479] hover:text-offwhite" />
      </div>
    </aside>
  );
}
