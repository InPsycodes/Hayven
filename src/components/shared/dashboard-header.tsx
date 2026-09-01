import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";
import { getRealNotificationsForUser } from "@/lib/notifications/queries";
import { NotificationBell } from "@/components/shared/notification-bell";

/**
 * Sub-page header for the signed-in portal. The portal renders in the
 * warm-dark care theme (.care-theme on the app shell), so this is just a
 * plain header row -- greeting, subtext, bell, avatar.
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
    <header className="flex items-center justify-between gap-3 px-5 py-6 text-foreground md:px-10 md:py-8">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {eyebrow && <span className="eyebrow text-[11px] text-terracotta">{eyebrow}</span>}
        <h1 className="truncate font-heading text-xl md:text-[28px] md:leading-tight md:font-medium">
          {greeting}
        </h1>
        <p className="truncate text-xs text-muted-foreground md:text-[13px]">{subtext}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-foreground [&_button]:text-foreground/80 [&_button:hover]:text-foreground">
          <NotificationBell notifications={notifications} />
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-[11px] font-medium text-white md:size-9">
          {initialsFromName(session.name)}
        </div>
      </div>
    </header>
  );
}
