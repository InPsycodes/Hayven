import { IconBell } from "@tabler/icons-react";

import { initialsFromName } from "@/data/format";
import type { AppSession } from "@/lib/auth/session";

/**
 * Dashboard page header: a dark full-width block on mobile (per the PWA home
 * screen spec), the same content rendered as a plain header row on desktop
 * (per the dashboard spec) -- one component, two responsive presentations.
 */
export function DashboardHeader({
  session,
  greeting,
  subtext,
}: {
  session: AppSession;
  greeting: string;
  subtext: string;
}) {
  return (
    <header className="flex items-center justify-between bg-charcoal px-5 py-5 text-offwhite md:bg-transparent md:px-10 md:py-9 md:text-charcoal">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl md:text-2xl">{greeting}</h1>
        <p className="text-xs text-offwhite/70 md:text-[13px] md:text-muted-foreground">
          {subtext}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <IconBell size={20} stroke={1.75} className="opacity-80" />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-[11px] font-medium text-white md:size-9">
          {initialsFromName(session.name)}
        </div>
      </div>
    </header>
  );
}
