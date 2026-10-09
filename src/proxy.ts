import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/data/types";

const ROLE_PREFIXES: { prefix: string; role: UserRole }[] = [
  { prefix: "/parent", role: "parent" },
  { prefix: "/therapist", role: "therapist" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/supervisor", role: "supervisor" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = ROLE_PREFIXES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  // Runs on every page (see config.matcher) so a rotated session token is
  // written back no matter where the user is -- otherwise the token silently
  // expires on /book, marketing pages, etc. and the next server render
  // bounces them to /login. The role lookup only happens for a role-gated path.
  const { response, role, isSupervisor } = await updateSupabaseSession(request, Boolean(match));

  if (!match) return response;

  // E9, external PRD review: the standalone role === "supervisor" mechanism
  // (migration 0023/0024) is retired -- confirmed zero live accounts use it,
  // and no code path can create one (signup rejects it, the signup trigger
  // falls back to "parent", the only admin grant action requires
  // role === "therapist"). Every supervisor is now a therapist granted
  // is_supervisor (migration 0054), who also still passes the /therapist
  // check below and keeps their own dashboard.
  const allowed =
    match.prefix === "/supervisor" ? role === "therapist" && isSupervisor : role === match.role;

  if (!allowed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
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
