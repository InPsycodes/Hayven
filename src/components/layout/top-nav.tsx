"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { MobileNavMenu } from "@/components/marketing/mobile-nav-menu";
import { useScrolled } from "@/components/marketing/use-scrolled";
import { cn } from "@/lib/utils";
import { roleHomePath } from "@/lib/auth/role-path";
import { initialsFromName } from "@/data/format";
import type { UserRole } from "@/data/types";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Find a therapist", href: "/search" },
  { label: "Learning Center", href: "/learn" },
  { label: "About Us", href: "/about" },
  { label: "For therapists", href: "/for-therapists" },
  { label: "For pediatricians", href: "/pediatricians" },
];

export interface NavSession {
  role: UserRole;
  name: string;
}

export function TopNav({ session }: { session?: NavSession | null }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return isHome ? <HeroNav session={session} /> : <SolidNav pathname={pathname} session={session} />;
}

/**
 * Standard dark bar, used on every marketing page except the landing page.
 * Sticky rather than fixed -- it starts in normal flow so nothing needs
 * padding-compensating for it, and only picks up the Liquid Glass treatment
 * (blurring whatever scrolls underneath) once it actually reaches the top.
 */
function SolidNav({ pathname, session }: { pathname: string; session?: NavSession | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(26,26,26,0.85)_0%,rgba(26,26,26,0.7)_100%)] px-6 py-5 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_34px_-16px_rgba(0,0,0,0.5)] md:px-10 [@media(display-mode:standalone)]:hidden">
      {/* Menu trigger sits first so it lands on the left below lg; it's
          lg:hidden, so desktop is unaffected and the logo stays first there. */}
      <MobileNavMenu
        links={LINKS}
        triggerClassName="-ml-2 text-offwhite/90 hover:text-offwhite"
        isOpen={menuOpen}
        onOpenChange={setMenuOpen}
        session={session ? { role: session.role, dashboardHref: roleHomePath(session.role) } : null}
      />
      <Link href="/">
        <BrandMark />
      </Link>
      <nav className="hidden items-center gap-7 lg:flex">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors",
                active
                  ? "text-offwhite underline decoration-terracotta decoration-2 underline-offset-8"
                  : "text-offwhite/70 hover:text-offwhite"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden items-center gap-4 lg:flex">
        {session ? (
          <Link
            href={roleHomePath(session.role)}
            className="flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm text-offwhite transition-colors hover:bg-white/20"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-terracotta text-[11px] font-medium text-white">
              {initialsFromName(session.name)}
            </span>
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="hidden text-sm text-offwhite/80 hover:text-offwhite sm:inline">
              Log in
            </Link>
            <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
              <Link href="/signup">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Landing-page-only nav: transparent over the hero photo, swapping to a
 * Liquid Glass panel once scrolled past ~75% of the viewport height --
 * heavy blur + saturation boost (so colour behind it stays vivid instead of
 * washing grey), a warm-white gradient standing in for glass curvature, and
 * an inset top highlight catching light the way a real refractive edge
 * would. Three colour roles cross-fade together at .35s ease.
 */
function HeroNav({ session }: { session?: NavSession | null }) {
  const scrolled = useScrolled(0.75);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between px-6 transition-[background-color,background-image,border-color,backdrop-filter,box-shadow] duration-[350ms] ease-in-out lg:px-10 [@media(display-mode:standalone)]:hidden",
        scrolled
          ? "border-b border-white/40 bg-[linear-gradient(180deg,rgba(250,248,246,0.78)_0%,rgba(250,248,246,0.55)_100%)] backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_34px_-16px_rgba(26,18,12,0.3)]"
          : "border-b border-transparent bg-transparent"
      )}
    >
      {/* Menu trigger first -> lands on the left below lg (it's lg:hidden). */}
      <MobileNavMenu
        links={LINKS}
        triggerClassName={cn(
          "-ml-2 transition-colors duration-[350ms] ease-in-out",
          scrolled ? "text-charcoal" : "text-canvas-white"
        )}
        isOpen={menuOpen}
        onOpenChange={setMenuOpen}
        session={session ? { role: session.role, dashboardHref: roleHomePath(session.role) } : null}
      />

      <Link href="/">
        <BrandMark
          dark={!scrolled}
          className="transition-colors duration-[350ms] ease-in-out"
        />
      </Link>

      <nav className="hidden items-center gap-9 lg:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-[15px] transition-colors duration-[350ms] ease-in-out hover:opacity-75",
              scrolled ? "text-ink-soft" : "text-canvas-white/80"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-4 lg:flex">
        {session ? (
          <Link
            href={roleHomePath(session.role)}
            className={cn(
              "flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium transition-colors duration-[350ms] ease-in-out",
              scrolled ? "bg-charcoal text-canvas-white hover:bg-charcoal/85" : "bg-canvas-white text-charcoal hover:bg-canvas-white/85"
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-terracotta text-[11px] font-medium text-white">
              {initialsFromName(session.name)}
            </span>
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className={cn(
                "hidden text-[15px] transition-colors duration-[350ms] ease-in-out sm:inline",
                scrolled ? "text-ink-soft hover:text-charcoal" : "text-canvas-white/80 hover:text-canvas-white"
              )}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={cn(
                "hidden rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-[350ms] ease-in-out sm:inline-block",
                scrolled ? "bg-charcoal text-canvas-white hover:bg-charcoal/85" : "bg-canvas-white text-charcoal hover:bg-canvas-white/85"
              )}
            >
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
