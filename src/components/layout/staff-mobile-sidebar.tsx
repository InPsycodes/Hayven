"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";
import type { IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";

import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/shared/brand-mark";
import { LogoutButton } from "@/components/shared/logout-button";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";

interface StaffNavItem {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
  active: boolean;
  count?: number;
}

/**
 * Collapsed top bar + slide-out drawer used by AdminSidebar/SupervisorSidebar
 * below md. The full-height sidebar those components render is desktop-only
 * (hidden on mobile) -- without this, the whole nav list rendered inline at
 * the top of the page, above the actual content, on phones.
 * Portaled to document.body for the same reason as MobileNavMenu: nesting a
 * `fixed` overlay inside an ancestor with backdrop-filter/transform traps it
 * inside that ancestor's box instead of the viewport.
 */
export function StaffMobileSidebar({
  items,
  userName,
  roleLabel,
}: {
  items: StaffNavItem[];
  userName: string;
  roleLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const triggerEl = triggerRef.current;

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
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
      if (window.innerWidth >= 768) setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      triggerEl?.focus();
    };
  }, [isOpen]);

  return (
    <div
      className="flex items-center justify-between px-4 py-4 md:hidden"
      style={{ background: "linear-gradient(184deg, var(--terracotta), var(--rust-dark) 78%)" }}
    >
      <BrandMark />
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="staff-mobile-sidebar-panel"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((v) => !v)}
        className="flex size-11 items-center justify-center text-canvas-white/90 transition-colors hover:text-canvas-white"
      >
        {isOpen ? <IconX size={22} stroke={1.75} /> : <IconMenu2 size={22} stroke={1.75} />}
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[60] md:hidden">
            <div
              aria-hidden
              onClick={() => setIsOpen(false)}
              className={cn(
                "absolute inset-0 bg-charcoal/40 backdrop-blur-sm",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[250ms]",
                "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
              )}
            />
            <div
              id="staff-mobile-sidebar-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              className={cn(
                "absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col justify-between px-4 py-8 shadow-[inset_-1px_0_0_rgba(255,255,255,0.25),8px_0_40px_-14px_rgba(26,18,12,0.45)] backdrop-blur-2xl backdrop-saturate-150",
                "motion-safe:animate-in motion-safe:slide-in-from-left-full motion-safe:duration-[280ms] motion-safe:ease-out",
                "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
              )}
              style={{
                background:
                  "linear-gradient(184deg, rgba(156,89,52,0.92) 0%, rgba(124,69,39,0.9) 78%)",
              }}
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <BrandMark />
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setIsOpen(false)}
                    className="flex size-11 items-center justify-center text-canvas-white/90"
                  >
                    <IconX size={22} stroke={1.75} />
                  </button>
                </div>
                <nav className="flex flex-col gap-1">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                        item.active
                          ? "bg-canvas-white font-semibold text-rust-dark"
                          : "text-canvas-white/85 hover:bg-white/10"
                      )}
                    >
                      <Icon icon={item.icon} size="sm" className="shrink-0 opacity-90" />
                      <span className="flex-1">{item.label}</span>
                      {!!item.count && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                            item.active ? "bg-terracotta/10 text-rust-dark" : "bg-white/20 text-canvas-white"
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/20 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas-white text-xs font-semibold text-rust-dark">
                    {initialsFromName(userName)}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium text-canvas-white">{userName}</span>
                    <span className="label-micro text-canvas-white/70">{roleLabel}</span>
                  </div>
                </div>
                <LogoutButton className="text-canvas-white/70 hover:text-canvas-white" />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
