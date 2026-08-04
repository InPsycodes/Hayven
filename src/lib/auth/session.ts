import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/data/types";

export interface AppSession {
  userId: string;
  role: UserRole;
  name: string;
}

/** Real, server-side session: the authenticated Supabase user + their public.users profile. */
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    role: profile.role as UserRole,
    name: profile.full_name as string,
  };
}
