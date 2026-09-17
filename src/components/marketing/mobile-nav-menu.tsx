"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavLinkItem {
  label: string;
  href: string;
}

export function MobileNavMenu({
  links,
  triggerClassName,
  isOpen,
  onOpenChange,
  session,
}: {
  links: NavLinkItem[];
  triggerClassName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session?: { role: string; dashboardHref: string } | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // isOpen is a controlled prop -- the parent owns it. To play an exit
  // animation before the portal unmounts, closing here is a two-step
  // handoff: mark isClosing (keeps rendering with the exit classes applied,
  // isOpen prop still true), then only call onOpenChange(false) once the
  // animation actually finishes (onAnimationEnd), which is what makes the
  // isOpen prop go false and the portal unmount.
  const [isClosing, setIsClosing] = useState(false);

  function close() {
    setIsClosing(true);
  }

  function handleAnimationEnd() {
    if (isClosing) {
      onOpenChange(false);
      setIsClosing(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const triggerEl = triggerRef.current;

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab" && focusable && focusable.length > 0) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    function handleResize() {
      if (window.innerWidth >= 1024) close();
    }

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      triggerEl?.focus();
    };
  }, [isOpen, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => onOpenChange(!isOpen)}
        className={cn(
          "flex size-11 items-center justify-center transition-colors lg:hidden",
          triggerClassName
        )}
      >
        {isOpen ? <IconX size={22} stroke={1.75} /> : <IconMenu2 size={22} stroke={1.75} />}
      </button>

      {(isOpen || isClosing) &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div
              aria-hidden
              onClick={close}
              onAnimationEnd={handleAnimationEnd}
              className={cn(
                "absolute inset-0 bg-charcoal/40 backdrop-blur-sm",
                !isClosing &&
                  "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[250ms] motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]",
                isClosing &&
                  "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-[200ms] motion-reduce:animate-out motion-reduce:fade-out motion-reduce:duration-[200ms]"
              )}
            />
            <div
              id="mobile-nav-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              onAnimationEnd={handleAnimationEnd}
              className={cn(
                "absolute inset-y-0 left-0 flex w-[72%] max-w-xs flex-col border-r border-white/50 bg-[linear-gradient(180deg,rgba(250,248,246,0.92)_0%,rgba(250,248,246,0.82)_100%)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.5),8px_0_40px_-14px_rgba(26,18,12,0.4)] backdrop-blur-2xl backdrop-saturate-150",
                !isClosing &&
                  "motion-safe:animate-in motion-safe:slide-in-from-left-full motion-safe:duration-[280ms] motion-safe:ease-out motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]",
                isClosing &&
                  "motion-safe:animate-out motion-safe:slide-out-to-left-full motion-safe:duration-[220ms] motion-safe:ease-in motion-reduce:animate-out motion-reduce:fade-out motion-reduce:duration-[200ms]"
              )}
            >
              <div className="flex h-20 items-center justify-between px-5">
                <BrandMark dark={false} />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={close}
                  className="flex size-11 items-center justify-center text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                >
                  <IconX size={22} stroke={1.75} />
                </button>
              </div>

              <nav className="flex flex-col gap-5 px-5 pt-4 sm:gap-6">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="font-heading text-lg text-charcoal sm:text-2xl"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-3 border-t border-charcoal/10 px-5 py-6">
                {session ? (
                  <Button asChild variant="accent" size="lg" className="w-full">
                    <Link href={session.dashboardHref} onClick={close}>
                      Go to dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={close}
                      className="py-2 text-center text-sm text-charcoal"
                    >
                      Log in
                    </Link>
                    <Button asChild variant="accent" size="lg" className="w-full">
                      <Link href="/signup" onClick={close}>
                        Get started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
