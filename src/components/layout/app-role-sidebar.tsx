"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMessageCircle } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/shared/brand-mark";
import { LogoutButton } from "@/components/shared/logout-button";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";
import { SIDEBAR_NAV } from "./nav-config";

const ROLE_LABEL = { parent: "Parent account", therapist: "Therapist workspace" } as const;

/**
 * Warm-dark "care portal" sidebar for parent/therapist. Badge counts are
 * keyed by nav href and computed by the caller (AppShell), so this
 * component has zero data-fetching of its own.
 */
export function AppRoleSidebar({
  session,
  role,
  counts,
}: {
  session: AppSession;
  role: "parent" | "therapist";
  counts: Record<string, number>;
}) {
  const pathname = usePathname();
  const items = SIDEBAR_NAV[role];

  return (
    <aside className="hidden w-44 shrink-0 flex-col justify-between gap-6 border-r border-care-line/60 bg-care-bg px-2.5 py-5 text-care-ink md:flex lg:w-60 lg:px-4">
      <div className="flex flex-col gap-6">
        <div className="px-2">
          <BrandMark />
        </div>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`));
            const count = counts[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] transition-colors lg:gap-2.5 lg:px-3 lg:text-[13px]",
                  active
                    ? "bg-care-accent/15 font-medium text-care-ink"
                    : "text-care-ink-soft hover:bg-care-surface"
                )}
              >
                <Icon icon={item.icon} size="sm" className="shrink-0 opacity-90" />
                <span className="flex-1">{item.label}</span>
                {typeof count === "number" && count > 0 && (
                  <span className="rounded-full bg-care-amber px-1.5 py-px text-[10.5px] font-bold text-[#241a0d]">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl border border-care-line/60 bg-care-surface p-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-care-ink-faint">Account</span>
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-care-sage/15 text-[10px] font-bold text-care-sage">
            {initialsFromName(session.name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-care-ink">{session.name}</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-care-ink-faint">{ROLE_LABEL[role]}</span>
          </div>
        </div>
        {role === "parent" && (
          <Link
            href="/parent/messages"
            className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-care-line py-1.5 text-[12px] font-medium text-care-ink transition-colors hover:bg-care-raised"
          >
            <IconMessageCircle size={13} stroke={1.75} />
            Message team
          </Link>
        )}
        <div className="mt-2.5 border-t border-care-line/60 pt-2.5">
          <LogoutButton className="text-care-ink-faint hover:text-care-ink" />
        </div>
      </div>
    </aside>
  );
}
