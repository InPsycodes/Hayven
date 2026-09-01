import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { UserRole } from "@/data/types";

/**
 * Refreshes the Supabase session cookie (the whole point -- this is the only
 * place a rotated token gets written back, since a Server Component's
 * setAll is a no-op) and, when `resolveRole` is set, also looks up the
 * caller's app role for proxy.ts's route gate.
 */
export async function updateSupabaseSession(request: NextRequest, resolveRole = true) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // @supabase/ssr's own default cookie options never include `secure`
          // (confirmed by reading the package source -- DEFAULT_COOKIE_OPTIONS
          // only sets path/sameSite/httpOnly/maxAge), so the session cookie
          // was shipping without the Secure attribute even in production,
          // confirmed via a live login. Guarded by NODE_ENV so it still works
          // over plain http://localhost in dev.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, secure: process.env.NODE_ENV === "production" })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  let isSupervisor = false;
  if (user && resolveRole) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_supervisor")
      .eq("id", user.id)
      .single();
    role = (profile?.role as UserRole) ?? null;
    isSupervisor = profile?.is_supervisor === true;
  }

  return { response, user, role, isSupervisor };
}
