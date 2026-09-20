import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { BrandMark } from "@/components/shared/brand-mark";
import { getOrganizationSchema } from "@/lib/seo/organization-schema";
import { safeJsonLdStringify } from "@/lib/seo/json-ld";
import { getSession } from "@/lib/auth/session";

const EXPLORE_LINKS = [
  { label: "Find a therapist", href: "/search" },
  { label: "Learning Center", href: "/learn" },
  { label: "For therapists", href: "/for-therapists" },
  { label: "For pediatricians", href: "/pediatricians" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "About", href: "/about" },
];

const GET_STARTED_LINKS = [
  { label: "Sign up as a parent", href: "/signup?role=parent" },
  { label: "Join as a therapist", href: "/signup?role=therapist" },
  { label: "Log in", href: "/login" },
];

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    // min-h-[calc(...)] instead of min-h-screen -- see the --pwa-reserve
    // comment in globals.css. Marketing pages are exactly where the PWA
    // install toast can show (pwa-install-prompt.tsx only excludes staff
    // areas and a handful of critical flows), so a short page (e.g.
    // /privacy) needs the same toast-aware min-height the auth/steps
    // layouts already use, or the footer's bottom links can end up
    // sitting under the toast on a short page.
    <div className="flex min-h-[calc(100dvh-var(--pwa-reserve,0px))] flex-col">
      {/* Static, developer-authored JSON from getOrganizationSchema() -- never user input.
          Still run through safeJsonLdStringify for consistency with therapists/[id]/page.tsx,
          so this stays safe if the schema ever grows a user-editable field. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(getOrganizationSchema()) }}
      />
      {/* Marketing chrome (links to sign up, social, contact) makes sense for
          a visitor deciding whether to convert -- not for someone who
          already installed the app. Hidden via a pure CSS media query so
          there's no flash of it before JS ever runs. Applied directly on
          TopNav's own header rather than a wrapping div -- a wrapper here
          would shrink-to-fit the header's height and leave position:sticky
          nowhere to travel before it unsticks. */}
      <TopNav session={session ? { role: session.role, name: session.name } : null} />
      <main id="main" className="flex-1">{children}</main>
      <footer className="bg-charcoal px-6 py-16 text-canvas-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] lg:px-10 [@media(display-mode:standalone)]:hidden">
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
            <h2 className="mb-4 text-sm font-semibold text-canvas-white">Contact</h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="mailto:hayvenmind@gmail.com" className="hover:text-canvas-white">
                  hayvenmind@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+2348122832137" className="hover:text-canvas-white">
                  +234 812 283 2137
                </a>
              </li>
              <li>Lagos, Nigeria</li>
              <li>
                <a
                  href="https://x.com/hayvenmind"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-canvas-white"
                >
                  @hayvenmind
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-7xl flex-col items-center gap-3 border-t border-white/10 pt-6 text-center text-xs text-canvas-white/50 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Hayven · Nigeria pilot</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-canvas-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-canvas-white">
              Terms of Service
            </Link>
          </div>
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
      <h2 className="mb-4 text-sm font-semibold text-canvas-white">{heading}</h2>
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
