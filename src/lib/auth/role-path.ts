import type { UserRole } from "@/data/types";

/**
 * Client-safe -- no "server-only" import, so client components can use this too.
 *
 * No `role === "supervisor"` branch (E9: that standalone mechanism is
 * retired) -- every supervisor is `role === "therapist"` with is_supervisor
 * set, so they land on their own practice by default, with supervisor
 * duties reachable from there (see SupervisorSidebar's "My dashboard" link).
 */
export function roleHomePath(role: UserRole): string {
  if (role === "admin") return "/admin/overview";
  return `/${role}`;
}
