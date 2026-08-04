"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { MobileNavMenu } from "@/components/marketing/mobile-nav-menu";
import { useScrolled } from "@/components/marketing/use-scrolled";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Find a therapist", href: "/search" },
  { label: "Learning Center", href: "/learn" },
  { label: "For therapists", href: "/signup" },
];

export function TopNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return isHome ? <HeroNav /> : <SolidNav pathname={pathname} />;
}

/** Standard dark bar, used on every marketing page except the landing page. */
function SolidNav({ pathname }: { pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between bg-charcoal px-6 py-5 md:px-10">
      <Link href="/">
        <BrandMark />
      </Link>
      <nav className="hidden items-center gap-7 md:flex">
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
      <div className="flex items-center gap-4">
        <Link href="/login" className="hidden text-sm text-offwhite/80 hover:text-offwhite sm:inline">
          Log in
        </Link>
        <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
          <Link href="/signup">Sign up</Link>
        </Button>
        <MobileNavMenu
          links={LINKS}
          triggerClassName="text-offwhite/90 hover:text-offwhite"
          isOpen={menuOpen}
          onOpenChange={setMenuOpen}
        />
      </div>
    </header>
  );
}

/**
 * Landing-page-only nav: transparent over the hero photo, swapping to a
 * frosted light bar once scrolled past ~75% of the viewport height. Three
 * colour roles cross-fade together at .35s ease.
 */
function HeroNav() {
  const scrolled = useScrolled(0.75);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between px-6 transition-[background-color,border-color,backdrop-filter] duration-[350ms] ease-in-out lg:px-10",
        scrolled
          ? "border-b border-charcoal/10 bg-offwhite/88 backdrop-blur-[10px]"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <Link href="/">
        <BrandMark
          dark={!scrolled}
          className="transition-colors duration-[350ms] ease-in-out"
        />
      </Link>

      <nav className="hidden items-center gap-9 md:flex">
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

      <div className="flex items-center gap-4">
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
        <MobileNavMenu
          links={LINKS}
          triggerClassName={cn(
            "transition-colors duration-[350ms] ease-in-out",
            scrolled ? "text-charcoal" : "text-canvas-white"
          )}
          isOpen={menuOpen}
          onOpenChange={setMenuOpen}
        />
      </div>
    </header>
  );
}
