import Link from "next/link";

import { cn } from "@/lib/utils";
import { getRealNotificationsForUser } from "@/lib/notifications/queries";
import { NotificationBell } from "@/components/shared/notification-bell";
import type { AppSession } from "@/lib/auth/session";

type Action = { label: string; href: string; variant?: "solid" | "ghost" };

/**
 * Dashboard header for the care-portal dashboards: entity avatar + name +
 * optional status pill + meta line on the left, up to two actions and the
 * notification bell on the right.
 */
export async function CareHeader({
  session,
  initials,
  title,
  status,
  meta,
  actions = [],
}: {
  session: AppSession;
  initials: string;
  title: string;
  status?: { label: string; tone: "ok" | "warn" };
  meta: string;
  actions?: Action[];
}) {
  const notifications = await getRealNotificationsForUser(session.userId);

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-care-accent/15 text-sm font-bold text-care-accent-bright">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2.5 font-heading text-xl font-medium text-care-ink lg:text-2xl">
            {title}
            {status && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  status.tone === "ok"
                    ? "bg-care-sage/15 text-care-sage-bright"
                    : "bg-care-amber/15 text-care-amber"
                )}
              >
                {status.tone === "ok" && <span className="size-1.5 rounded-full bg-care-sage" />}
                {status.label}
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-care-ink-faint md:truncate md:text-[13px]">{meta}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className={cn(
              "inline-flex items-center rounded-lg px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors pointer-coarse:min-h-11 sm:px-4 sm:py-2",
              a.variant === "ghost"
                ? "border border-care-line text-care-ink hover:bg-care-surface"
                : "bg-care-accent-deep text-white hover:bg-care-accent-deep/85"
            )}
          >
            {a.label}
          </Link>
        ))}
        <div className="text-care-ink [&_button]:text-care-ink/80 [&_button:hover]:text-care-ink">
          <NotificationBell notifications={notifications} />
        </div>
      </div>
    </header>
  );
}
