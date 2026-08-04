"use client";

import { useTransition } from "react";
import { IconLogout } from "@tabler/icons-react";

import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function LogoutButton({ className, label }: { className?: string; label?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className={cn(
        "flex items-center gap-2 text-sm transition-colors disabled:opacity-50",
        className
      )}
    >
      <IconLogout size={16} stroke={1.75} />
      {label ?? "Log out"}
    </button>
  );
}
