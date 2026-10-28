import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Whether the signed-in user has an email + password sign-in. Google-only accounts don't, so there's nothing to change. */
export async function hasPasswordSignIn(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider];
  return providers.includes("email");
}
