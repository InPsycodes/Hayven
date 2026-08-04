import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { BrandMark } from "@/components/shared/brand-mark";

const EXPLORE_LINKS = [
  { label: "Find a therapist", href: "/search" },
  { label: "Learning Center", href: "/learn" },
  { label: "For therapists", href: "/signup" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "About", href: "/#about" },
];

const GET_STARTED_LINKS = [
  { label: "Sign up as a parent", href: "/signup" },
  { label: "Join as a therapist", href: "/signup" },
  { label: "Log in", href: "/login" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-charcoal px-6 py-16 text-canvas-white/70 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-[22ch] text-sm text-canvas-white/60">
              Verified paediatric therapists for Nigerian families.
            </p>
          </div>

          <FooterColumn heading="Explore" links={EXPLORE_LINKS} />
          <FooterColumn heading="Get started" links={GET_STARTED_LINKS} />

          <div>
            <h3 className="mb-4 text-sm font-semibold text-canvas-white">Contact</h3>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="mailto:hello@hayven.com" className="hover:text-canvas-white">
                  hello@hayven.com
                </a>
              </li>
              <li>
                <a href="tel:+2348122832137" className="hover:text-canvas-white">
                  +234 812 283 2137
                </a>
              </li>
              <li>Lagos, Nigeria</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-7xl border-t border-white/10 pt-6 text-center text-xs text-canvas-white/50">
          © {new Date().getFullYear()} Hayven · Nigeria pilot
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-canvas-white">{heading}</h3>
      <ul className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className="hover:text-canvas-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
