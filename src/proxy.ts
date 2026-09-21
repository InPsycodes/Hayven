import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/data/types";

const ROLE_PREFIXES: { prefix: string; role: UserRole }[] = [
  { prefix: "/parent", role: "parent" },
  { prefix: "/therapist", role: "therapist" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/supervisor", role: "supervisor" },
];

// Reachable by an admin with no MFA factor enrolled -- has to stay a real
// allowlist, not just "not /admin", or the E8 redirect below would send
// them into a loop trying to reach the one page that lets them fix it.
const ADMIN_MFA_BOOTSTRAP_PATH = "/admin/settings";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = ROLE_PREFIXES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  // Runs on every page (see config.matcher) so a rotated session token is
  // written back no matter where the user is -- otherwise the token silently
  // expires on /book, marketing pages, etc. and the next server render
  // bounces them to /login. The role lookup only happens for a role-gated path.
  const { response, role, isSupervisor, mfaEnrolled } = await updateSupabaseSession(request, Boolean(match));

  if (!match) return response;

  // /supervisor is reachable two ways: a plain role === "supervisor"
  // account (the original mechanism), or a therapist granted is_supervisor
  // -- who also still passes the /therapist check below and keeps their own
  // dashboard. See migration 0054.
  const allowed =
    match.prefix === "/supervisor"
      ? role === "supervisor" || (role === "therapist" && isSupervisor)
      : role === match.role;

  if (!allowed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // E8 from the external PRD review: admin was the one role that could
  // operate with no MFA at all -- getSession() (src/lib/auth/session.ts)
  // already rejects a session that hasn't stepped up to a factor it HAS
  // enrolled, on every page, every role; nothing previously required an
  // admin to have enrolled one in the first place. Scoped to admin only
  // for now, not supervisor too (the review's other ask) -- a supervisor
  // is often a therapist with an extra flag, and /supervisor is a separate
  // route from /therapist, so this wouldn't touch their own practice
  // either way; kept out of this change to prove the pattern is safe on
  // the highest-value target first before widening it.
  if (match.prefix === "/admin" && role === "admin" && !mfaEnrolled && pathname !== ADMIN_MFA_BOOTSTRAP_PATH) {
    return NextResponse.redirect(new URL(ADMIN_MFA_BOOTSTRAP_PATH, request.url));
  }

  return response;
}

export const config = {
  // Every route except Next internals, API routes (they own their auth and
  // the Paystack webhook must not take an extra Supabase round-trip), the
  // PostHog reverse-proxy paths (ingest/, see next.config.ts -- a logged-in
  // user fires many analytics beacons and none of them should cost a
  // Supabase Auth round-trip), and static assets. The session-refresh needs
  // to run app-wide; the role gate inside proxy() still only fires on the
  // role-prefixed paths above.
  matcher: [
    "/((?!api/|ingest/|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|~offline|robots.txt|sitemap.xml|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf)$).*)",
  ],
};
