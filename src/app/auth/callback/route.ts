import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for "Continue with Google". Google sign-in is for parents
 * only: therapists and admins keep password + two-factor, so an existing
 * non-parent account (Supabase links identities by verified email) is signed
 * straight back out here rather than handed a Google session that skips the
 * admin sign-in audit trail. New Google accounts are always created as
 * parents -- signInWithOAuth can't carry a role, and the handle_new_user
 * trigger defaults to parent -- but have no recorded consent or phone yet, so
 * they're sent to /signup/finish first.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const nextParam = searchParams.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/parent";

  const fail = (code: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", code);
    return NextResponse.redirect(url);
  };

  const code = searchParams.get("code");
  if (!code || searchParams.get("error")) return fail("google-cancelled");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("google-failed");

  const { data: profile } = await supabase
    .from("users")
    .select("role, status, terms_accepted_at")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return fail("google-failed");
  }
  if (profile.status === "suspended") {
    await supabase.auth.signOut();
    return fail("google-suspended");
  }
  if (profile.role !== "parent") {
    await supabase.auth.signOut();
    return fail("google-parent-only");
  }

  const dest = request.nextUrl.clone();
  dest.search = "";
  if (!profile.terms_accepted_at) {
    dest.pathname = "/signup/finish";
    dest.searchParams.set("next", next);
  } else {
    dest.pathname = next;
  }
  return NextResponse.redirect(dest);
}
