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

  // Always run this so the Supabase session cookie stays refreshed, even on
  // routes that aren't role-gated.
  const { response, role, isSupervisor } = await updateSupabaseSession(request);

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

  return response;
}

export const config = {
  matcher: [
    "/parent",
    "/parent/:path*",
    "/therapist",
    "/therapist/:path*",
    "/admin",
    "/admin/:path*",
    "/supervisor",
    "/supervisor/:path*",
  ],
};
