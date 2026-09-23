import { redirect } from "next/navigation";

import { roleHomePath } from "@/lib/auth/role-path";

/**
 * The bare /admin segment has no content of its own -- every admin surface
 * lives under a specific subpath. Without this, visiting/bookmarking
 * /admin directly 404s with a bare, unstyled Next.js error page (no nav,
 * no way back into the app) instead of landing somewhere useful. The admin
 * layout above this still applies its own auth/MFA gating either way.
 */
export default function AdminIndexPage() {
  redirect(roleHomePath("admin"));
}
