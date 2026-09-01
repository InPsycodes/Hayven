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

// A therapist granted supervisor access (see migration 0054) still has a
// real practice of their own, so unlike a plain role === "supervisor"
// account, they need a way back to it from inside the supervisor portal.
const MY_DASHBOARD_ITEM = { label: "My dashboard", href: "/therapist", icon: IconStethoscope };

export function SupervisorSidebar({
  session,
  teamCount = 0,
}: {
  session: AppSession;
  teamCount?: number;
}) {
  const pathname = usePathname();
  const items = session.role === "therapist" ? [MY_DASHBOARD_ITEM, ...SUPERVISOR_NAV] : SUPERVISOR_NAV;

  return (
    <>
      <SupervisorBottomNav items={items.map(({ label, href, icon }) => ({ label, href, icon }))} />
      <aside
        className="hidden w-full shrink-0 flex-col justify-between px-4 py-8 md:flex md:w-50"
        style={{ background: "linear-gradient(184deg, var(--terracotta), var(--rust-dark) 78%)" }}
      >
        <div className="flex flex-col gap-8">
          <BrandMark />
          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const count = item.href === "/supervisor" ? teamCount : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                    active ? "bg-canvas-white font-semibold text-rust-dark" : "text-canvas-white/85 hover:bg-white/10"
                  )}
                >
                  <Icon icon={item.icon} size="sm" className="shrink-0 opacity-90" />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                        active ? "bg-terracotta/10 text-rust-dark" : "bg-white/20 text-canvas-white"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/20 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas-white text-xs font-semibold text-rust-dark">
              {initialsFromName(session.name)}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-canvas-white">{session.name}</span>
              <span className="label-micro text-canvas-white/70">Supervisor</span>
            </div>
          </div>
          <LogoutButton className="text-canvas-white/70 hover:text-canvas-white" />
        </div>
      </aside>
    </>
  );
}
