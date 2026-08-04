"use client";

import { useEffect, useRef } from "react";
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
}: {
  links: NavLinkItem[];
  triggerClassName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        onOpenChange(false);
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
      if (window.innerWidth >= 768) onOpenChange(false);
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
          "flex size-11 items-center justify-center transition-colors md:hidden",
          triggerClassName
        )}
      >
        {isOpen ? <IconX size={22} stroke={1.75} /> : <IconMenu2 size={22} stroke={1.75} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            aria-hidden
            onClick={() => onOpenChange(false)}
            className={cn(
              "absolute inset-0 bg-charcoal/40",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[250ms]",
              "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
            )}
          />
          <div
            id="mobile-nav-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            className={cn(
              "absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-offwhite shadow-2xl",
              "motion-safe:animate-in motion-safe:slide-in-from-left-full motion-safe:duration-[280ms] motion-safe:ease-out",
              "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
            )}
          >
            <div className="flex h-20 items-center justify-between px-6">
              <BrandMark dark={false} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => onOpenChange(false)}
                className="flex size-11 items-center justify-center text-charcoal"
              >
                <IconX size={22} stroke={1.75} />
              </button>
            </div>

            <nav className="flex flex-col gap-6 px-6 pt-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => onOpenChange(false)}
                  className="font-heading text-2xl text-charcoal"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-charcoal/10 px-6 py-6">
              <Link
                href="/login"
                onClick={() => onOpenChange(false)}
                className="py-2 text-center text-sm text-charcoal"
              >
                Log in
              </Link>
              <Button asChild variant="accent" size="lg" className="w-full">
                <Link href="/signup" onClick={() => onOpenChange(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
