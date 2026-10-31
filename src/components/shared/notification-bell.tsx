"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@tabler/icons-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";
import type { RealNotification } from "@/lib/notifications/queries";
import { formatDateTime } from "@/data/format";
import { cn } from "@/lib/utils";

export function NotificationBell({ notifications }: { notifications: RealNotification[] }) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();
  const unreadCount = items.filter((n) => !n.read).length;

  function markOneRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function openNotification(n: RealNotification) {
    if (!n.read) markOneRead(n.id);
    // Only ever follow an in-app path. Every url we write is a hardcoded
    // "/..." literal, but a notification row is (by RLS) user-updatable, so
    // refuse anything that could be an off-site or protocol-relative jump.
    if (n.url && /^\/(?!\/)/.test(n.url)) router.push(n.url);
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative flex size-11 shrink-0 items-center justify-center opacity-80 hover:opacity-100"
      >
        <IconBell size={20} stroke={1.75} />
        {unreadCount > 0 && (
          <span className="pop-in absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-terracotta-fill text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0 text-charcoal">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-terracotta hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={cn(
                  "flex flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-paper",
                  !n.read && "bg-terracotta/5",
                  n.url ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-terracotta" />}
                  <span className="text-sm font-medium text-charcoal">{n.title}</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                <span className="text-[11px] text-muted-foreground/70">{formatDateTime(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
