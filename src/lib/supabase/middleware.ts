import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { UserRole } from "@/data/types";

/** Refreshes the Supabase session cookie and resolves the caller's app role, for use in proxy.ts. */
export async function updateSupabaseSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
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
  if (user) {
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
