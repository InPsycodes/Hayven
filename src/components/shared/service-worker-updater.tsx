"use client";

import { useEffect } from "react";
import { useSerwist } from "@serwist/turbopack/react";

/**
 * @serwist/window's Serwist class only checks for a new service-worker
 * version once, at registration time -- it has no visibilitychange
 * listener. Reopening an already-running installed PWA (switching back to
 * a home-screen app, the normal way people use one on a phone) never
 * triggers a fresh check on its own, so a deployed update can sit unseen
 * until the browser's own lazy background check eventually fires (up to
 * ~24h later) or the user force-closes and reopens the app. This
 * component closes that gap: check for an update whenever the page
 * becomes visible, and reload once (skipWaiting + clientsClaim are
 * already set on the SW itself, so an update found this way activates and
 * claims this page immediately -- the reload just picks up the new HTML/
 * JS the now-active SW would otherwise only serve on the *next* load).
 */
export function ServiceWorkerUpdater() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") void serwist.update();
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => document.removeEventListener("visibilitychange", checkForUpdate);
  }, [serwist]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
