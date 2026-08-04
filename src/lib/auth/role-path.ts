import type { UserRole } from "@/data/types";

/** Client-safe -- no "server-only" import, so client components can use this too. */
export function roleHomePath(role: UserRole): string {
  if (role === "admin") return "/admin/verification";
  return `/${role}`;
}
