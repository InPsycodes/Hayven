"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconUsers, IconUserCheck, IconShieldLock, IconStethoscope } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/shared/brand-mark";
import { LogoutButton } from "@/components/shared/logout-button";
import { SupervisorBottomNav } from "@/components/layout/supervisor-bottom-nav";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";

const SUPERVISOR_NAV = [
  { label: "Team", href: "/supervisor", icon: IconUsers },
  { label: "Assignments", href: "/supervisor/assignments", icon: IconUserCheck },
  { label: "Settings", href: "/supervisor/settings", icon: IconShieldLock },
];

// A therapist granted supervisor access (migration 0054) still has a real
// practice of their own, so they need a way back to it from inside the
// supervisor portal. E9: this is now unconditional -- the standalone
// role === "supervisor" mechanism (which had no practice to link back to)
// is retired, so every session here is a therapist.
const MY_DASHBOARD_ITEM = { label: "My dashboard", href: "/therapist", icon: IconStethoscope };

export function SupervisorSidebar({
  session,
  teamCount = 0,
}: {
  session: AppSession;
  teamCount?: number;
}) {
  const pathname = usePathname();
  const items = [MY_DASHBOARD_ITEM, ...SUPERVISOR_NAV];

  return (
    <>
      <SupervisorBottomNav items={items.map(({ label, href, icon }) => ({ label, href, icon }))} />
      <aside className="hidden w-56 shrink-0 flex-col justify-between gap-6 border-r border-care-line/60 bg-care-bg px-4 py-5 text-care-ink md:flex">
        <div className="flex flex-col gap-6">
          <div className="px-2">
            <BrandMark />
          </div>
          <nav className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const count = item.href === "/supervisor" ? teamCount : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-care-accent/15 font-medium text-care-ink"
                      : "text-care-ink-soft hover:bg-care-surface"
                  )}
                >
                  <Icon icon={item.icon} size="sm" className="shrink-0 opacity-90" />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
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
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-care-ink-faint">You</span>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-care-sage/15 text-[10px] font-bold text-care-sage-bright">
              {initialsFromName(session.name)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-care-ink">{session.name}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-care-ink-faint">Supervisor</span>
            </div>
          </div>
          <div className="mt-2.5 border-t border-care-line/60 pt-2.5">
            <LogoutButton className="text-care-ink-faint hover:text-care-ink" />
          </div>
        </div>
      </aside>
    </>
  );
}
