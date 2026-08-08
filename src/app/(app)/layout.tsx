import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Middleware already gates /parent and /therapist by role; this is a
  // belt-and-suspenders fallback for direct server-render access. Allowlist
  // rather than excluding "admin" specifically, so a future role (like
  // supervisor) can't fall through into this shell by default.
  if (!session || (session.role !== "parent" && session.role !== "therapist")) {
    redirect("/login");
  }

  return <AppShell session={session}>{children}</AppShell>;
}
