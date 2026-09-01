import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";
import { getRealNotificationsForUser } from "@/lib/notifications/queries";
import { NotificationBell } from "@/components/shared/notification-bell";

/**
 * Dashboard page header: a dark full-width block on mobile (per the PWA home
 * screen spec), the same content rendered as a plain header row on desktop
 * (per the dashboard spec) -- one component, two responsive presentations.
 */
export async function DashboardHeader({
  session,
  greeting,
  subtext,
  eyebrow,
}: {
  session: AppSession;
  greeting: string;
  subtext: string;
  /** Small uppercase kicker above the greeting ("Welcome back," etc.). */
  eyebrow?: string;
}) {
  const notifications = await getRealNotificationsForUser(session.userId);

  return (
    <header className="flex items-center justify-between gap-3 bg-charcoal px-5 py-5 text-offwhite md:bg-transparent md:px-10 md:py-9 md:text-charcoal">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {eyebrow && (
          <span className="eyebrow text-[11px] text-amber md:text-terracotta">{eyebrow}</span>
        )}
        <h1 className="truncate font-heading text-xl md:text-[32px] md:leading-tight md:font-medium">
          {greeting}
        </h1>
        <p className="truncate text-xs text-offwhite/70 md:text-[13px] md:text-muted-foreground">
          {subtext}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <NotificationBell notifications={notifications} />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-[11px] font-medium text-white md:size-9">
          {initialsFromName(session.name)}
        </div>
      </div>
    </header>
  );
}
