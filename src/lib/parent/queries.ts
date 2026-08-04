import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RealChild {
  id: string;
  parentId: string;
  firstName: string;
  dateOfBirth: string;
  presentingConcern: string | null;
  createdAt: string;
}

export async function getRealChildrenForParent(parentId: string): Promise<RealChild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .select("id, parent_id, first_name, date_of_birth, presenting_concern, created_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    firstName: row.first_name,
    dateOfBirth: row.date_of_birth,
    presentingConcern: row.presenting_concern,
    createdAt: row.created_at,
  }));
}

export async function getRealChildById(id: string): Promise<RealChild | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .select("id, parent_id, first_name, date_of_birth, presenting_concern, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    parentId: data.parent_id,
    firstName: data.first_name,
    dateOfBirth: data.date_of_birth,
    presentingConcern: data.presenting_concern,
    createdAt: data.created_at,
  };
}
