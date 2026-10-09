"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconShieldCheck,
  IconUsers,
  IconUserCog,
  IconReportAnalytics,
  IconChartBar,
  IconHistory,
  IconUserX,
  IconReceiptRefund,
  IconGavel,
  IconCashBanknote,
  IconMessage2,
  IconLifebuoy,
  IconShieldLock,
  IconBooks,
  IconStethoscope,
  IconShieldHeart,
  IconLayoutDashboard,
} from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/shared/brand-mark";
import { LogoutButton } from "@/components/shared/logout-button";
import { StaffMobileSidebar } from "@/components/layout/staff-mobile-sidebar";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";

// Grouped by what the admin is doing: today's work, people, money,
// content, and the system itself. The group heading renders once, above
// the first item of each group (desktop sidebar and mobile drawer).
const ADMIN_NAV = [
  { group: "Today", label: "Overview", href: "/admin/overview", icon: IconLayoutDashboard },
  { group: "Today", label: "Safeguarding", href: "/admin/safeguarding", icon: IconShieldHeart },
  { group: "People", label: "Verification", href: "/admin/verification", icon: IconShieldCheck },
  { group: "People", label: "Accounts", href: "/admin/accounts", icon: IconUserCog },
  { group: "People", label: "Assignments", href: "/admin/users", icon: IconUsers },
  { group: "People", label: "Referrals", href: "/admin/referrals", icon: IconStethoscope },
  { group: "People", label: "Support", href: "/admin/support", icon: IconLifebuoy },
  { group: "People", label: "Deletions", href: "/admin/deletion-requests", icon: IconUserX },
  { group: "Money", label: "Payouts", href: "/admin/payouts", icon: IconCashBanknote },
  { group: "Money", label: "Refunds", href: "/admin/refunds", icon: IconReceiptRefund },
  { group: "Money", label: "Disputes", href: "/admin/disputes", icon: IconGavel },
  { group: "Content", label: "Reports", href: "/admin/reports", icon: IconReportAnalytics },
  { group: "Content", label: "Report phrases", href: "/admin/report-phrases", icon: IconMessage2 },
  { group: "Content", label: "Learning", href: "/admin/learning", icon: IconBooks },
  { group: "System", label: "Metrics", href: "/admin/metrics", icon: IconChartBar },
  { group: "System", label: "Audit log", href: "/admin/audit-log", icon: IconHistory },
  { group: "System", label: "Settings", href: "/admin/settings", icon: IconShieldLock },
];

export function AdminSidebar({
  session,
  counts = {},
  showSafeguarding = false,
}: {
  session: AppSession;
  counts?: Record<string, number>;
  /** Only the safeguarding leads see the entry at all (src/lib/safeguarding/leads.ts). */
  showSafeguarding?: boolean;
}) {
  const pathname = usePathname();
  const navItems = ADMIN_NAV.filter((item) => showSafeguarding || item.href !== "/admin/safeguarding");

  return (
    <>
      <StaffMobileSidebar
        items={navItems.map((item) => ({
          ...item,
          active: pathname.startsWith(item.href),
          count: counts[item.href] ?? 0,
        }))}
        userName={session.name}
        roleLabel="Admin"
      />
      <aside
        className="sticky top-0 hidden h-dvh w-full shrink-0 flex-col justify-between gap-4 self-start px-4 py-6 md:flex md:w-50"
        style={{ background: "linear-gradient(184deg, var(--terracotta), var(--rust-dark) 78%)" }}
      >
        <div className="flex min-h-0 flex-col gap-6">
          <BrandMark />
          <nav className="-mx-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1">
            {navItems.map((item, i) => {
              const active = pathname.startsWith(item.href);
              const count = counts[item.href] ?? 0;
              const firstInGroup = i === 0 || navItems[i - 1].group !== item.group;
              return (
                <div key={item.href} className="flex flex-col">
                {firstInGroup && (
                  <span className={cn("label-micro px-3 pb-1 text-canvas-white/60", i > 0 && "mt-3")}>{item.group}</span>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
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
                </div>
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
              <span className="label-micro text-canvas-white/70">Admin</span>
            </div>
          </div>
          <LogoutButton className="text-canvas-white/70 hover:text-canvas-white" />
        </div>
      </aside>
    </>
  );
}
