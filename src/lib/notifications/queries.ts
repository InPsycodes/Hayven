import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RealNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  url: string | null;
}

export async function getRealNotificationsForUser(userId: string, limit = 20): Promise<RealNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, created_at, url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
    url: (row as { url?: string | null }).url ?? null,
  }));
}
