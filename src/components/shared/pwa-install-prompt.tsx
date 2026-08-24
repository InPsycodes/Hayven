"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  // Admin/supervisor are staff back-office workflows, not the home-screen
  // app experience this prompt is for -- also happens to be exactly where
  // it was overlapping the verification panel's action buttons, since that
  // panel's own button row is bottom-anchored in the same screen region.
  const isStaffArea = pathname?.startsWith("/admin") || pathname?.startsWith("/supervisor");

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

  const showing = visible && !isStaffArea;

  // Fixed-position elements don't reserve layout space on their own, so this
  // toast was landing directly on top of whatever real content happened to
  // sit at that screen position -- confirmed on a live audit to fully block
  // the signup consent checkbox and the therapist profile's price input,
  // and to hide the login page's "Sign up" link and the footer's legal
  // links. Toggling this class reserves real space at the bottom of the
  // page (see globals.css) so content is pushed clear instead of covered,
  // for as long as the toast is actually showing.
  useEffect(() => {
    document.body.classList.toggle("pwa-prompt-reserved", showing);
    return () => {
      document.body.classList.remove("pwa-prompt-reserved");
    };
  }, [showing]);

  if (!showing) return null;

  return (
    // Narrower + right-anchored on mobile too (not full-width inset-x-4)
    // -- a live audit found this, at full width, landing on top of
    // whatever form field or link happened to sit in its fixed
    // viewport-relative band on a long, naturally-scrolling page (the
    // therapist profile page's price field). The space-reservation CSS
    // above (see globals.css --pwa-reserve) handles short, single-screen
    // pages fully; a `fixed` overlay can still coincide with mid-page
    // content on a long one at whatever the current scroll position is,
    // which no amount of padding fixes. Shrinking the footprint reduces
    // how much of any given field/link it can cover, on top of it always
    // being dismissible via the X button.
    <div
      role="complementary"
      aria-label="Install Hayven"
      className="fixed inset-x-4 bottom-20 z-40 ml-auto flex max-w-[280px] items-center gap-3 rounded-sm bg-charcoal px-4 py-3 text-offwhite shadow-lg md:bottom-4 md:inset-x-auto md:right-4 md:z-50 md:max-w-sm"
    >
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
