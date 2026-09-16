"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/notifications/push-actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

type Status = "unsupported" | "checking" | "off" | "on" | "denied";

/**
 * Push permission can only be requested from a real user gesture (the
 * button click below), never on page load -- browsers silently ignore or
 * auto-deny a permission prompt fired without one.
 */
export function PushNotificationsToggle({
  description = "Get alerted on this device for new messages, reports, and session updates.",
}: {
  description?: string;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function checkStatus(): Promise<Status> {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      return subscription ? "on" : "off";
    }

    checkStatus().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          setError("Push notifications aren't configured yet.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          setError("Couldn't set up push notifications on this browser.");
          return;
        }
        const result = await subscribeToPush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setStatus("on");
      } catch {
        setError("Couldn't set up push notifications on this browser.");
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    });
  }

  if (status === "unsupported") return null;

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base text-charcoal">Push notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {status !== "checking" && (
          <StatusBadge tone={status === "on" ? "sage" : "grey"}>
            {status === "on" ? "On" : status === "denied" ? "Blocked" : "Off"}
          </StatusBadge>
        )}
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      {status === "denied" ? (
        <p className="text-xs text-muted-foreground">
          Notifications are blocked for Hayven in your browser settings. Allow them there to turn this on.
        </p>
      ) : (
        status !== "checking" && (
          <Button
            type="button"
            variant={status === "on" ? "outline" : "default"}
            disabled={isPending}
            onClick={status === "on" ? disable : enable}
            className="w-fit"
          >
            {isPending ? "Working..." : status === "on" ? "Turn off" : "Turn on"}
          </Button>
        )
      )}
    </div>
  );
}
