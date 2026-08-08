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

const ROLE_LABEL = { parent: "Parent account", therapist: "Therapist workspace" } as const;

/**
 * Shared rust-gradient sidebar for parent/therapist -- badge counts are
 * keyed by nav href and computed by the caller (AppShell), so this component
 * has zero data-fetching of its own, just rendering.
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
    <aside
      className="hidden w-56 shrink-0 flex-col justify-between px-5 py-8 md:flex"
      style={{ background: "linear-gradient(184deg, var(--terracotta), var(--rust-dark) 78%)" }}
    >
      <div className="flex flex-col gap-8">
        <BrandMark />
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active =
              pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`));
            const count = counts[item.href];
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
                {typeof count === "number" && count > 0 && (
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
            <span className="label-micro text-canvas-white/70">{ROLE_LABEL[role]}</span>
          </div>
        </div>
        <LogoutButton className="text-canvas-white/70 hover:text-canvas-white" />
      </div>
    </aside>
  );
}
