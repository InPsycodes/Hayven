import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server Component / Server Action Supabase client -- respects RLS via the user's session cookie. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // @supabase/ssr's own default cookie options never include
            // `secure` (confirmed by reading the package source), so the
            // session cookie was shipping without the Secure attribute even
            // in production, confirmed via a live login. Guarded by NODE_ENV
            // so it still works over plain http://localhost in dev.
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, secure: process.env.NODE_ENV === "production" })
            );
          } catch {
            // Called from a Server Component -- safe to ignore since the
            // proxy (middleware) refreshes the session cookie on navigation.
          }
        },
      },
    }
  );
}
