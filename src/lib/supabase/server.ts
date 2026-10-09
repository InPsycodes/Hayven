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
            //
            // httpOnly: true (AUD-06, external audit 2026-10-08) -- the
            // library's own default is false, meaning document.cookie could
            // read the session token. Confirmed safe to force on: the only
            // browser-side Supabase client in the app (google-button.tsx)
            // only ever calls signInWithOAuth() to kick off a redirect, it
            // never reads the session cookie client-side, and both auth
            // callback routes that write the real session (auth/callback,
            // auth/confirm) go through this same client.
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === "production",
                httpOnly: true,
              })
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
