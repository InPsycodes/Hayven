"use client";

import { useEffect, useState } from "react";
import { IconDownload, IconShare2, IconX } from "@tabler/icons-react";

const DISMISS_KEY = "hayven-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * iOS Safari never fires beforeinstallprompt and has no programmatic install
 * API at all -- Add to Home Screen is a manual Share-sheet action there, so
 * this shows an instructional hint instead of a button on iOS.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Deferred a tick so the initial detection runs as a callback rather
    // than synchronously in the effect body (avoids cascading renders on
    // mount for the common case where nothing ends up shown at all).
    const timer = setTimeout(() => {
      if (localStorage.getItem(DISMISS_KEY)) return;

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone) return;

      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
      if (ios) {
        setIsIos(true);
        setVisible(true);
      }
    }, 0);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    if (outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 flex items-center gap-3 rounded-sm bg-charcoal px-4 py-3 text-offwhite shadow-lg md:bottom-4 md:inset-x-auto md:right-4 md:z-50 md:max-w-sm">
      {isIos ? (
        <>
          <IconShare2 size={20} stroke={1.75} className="shrink-0 text-terracotta" />
          <p className="text-sm text-offwhite/90">
            Install Hayven: tap <span className="font-medium text-offwhite">Share</span>, then{" "}
            <span className="font-medium text-offwhite">Add to Home Screen</span>.
          </p>
        </>
      ) : (
        <>
          <IconDownload size={20} stroke={1.75} className="shrink-0 text-terracotta" />
          <p className="flex-1 text-sm text-offwhite/90">Install Hayven for quicker access.</p>
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-sm bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-terracotta/90"
          >
            Install
          </button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-offwhite/50 hover:text-offwhite"
      >
        <IconX size={16} stroke={1.75} />
      </button>
    </div>
  );
}
