"use client";

import { useMemo, useState, useTransition } from "react";
import { IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, initialsFromName } from "@/data/format";
import type { AdminUserRow } from "@/lib/admin/queries";
import { setUserAccountStatus, resetUserAccountPassword } from "@/lib/admin/actions";

const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "parent", label: "Parents" },
  { key: "therapist", label: "Therapists" },
  { key: "supervisor", label: "Supervisors" },
  { key: "admin", label: "Admins" },
];

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await resetUserAccountPassword(userId, password);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onDone();
        });
      }}
    >
      <Input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        className="w-56"
        autoFocus
      />
      <Button type="submit" size="sm" variant="accent" disabled={isPending}>
        {isPending ? "Saving..." : "Set password"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-error">{error}</p>}
    </form>
  );
}

function AccountRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [localStatus, setLocalStatus] = useState(user.status);

  const suspended = localStatus === "suspended";

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
            {initialsFromName(user.fullName)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-charcoal">{user.fullName}</p>
              {isSelf && <span className="text-[11px] text-muted-foreground">(you)</span>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge tone="grey">{user.role}</StatusBadge>
          <StatusBadge tone={suspended ? "error" : "sage"}>{suspended ? "Suspended" : "Active"}</StatusBadge>
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            Joined {formatDate(user.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-charcoal/8 pt-3">
        <Button
          size="sm"
          variant={suspended ? "outline" : "destructive"}
          disabled={isPending || isSelf}
          onClick={() =>
            startTransition(async () => {
              const nextStatus = suspended ? "active" : "suspended";
              const result = await setUserAccountStatus(user.id, nextStatus);
              if (result.ok) setLocalStatus(nextStatus);
            })
          }
        >
          {isPending ? "Saving..." : suspended ? "Reactivate" : "Suspend"}
        </Button>
        <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => setResetting((v) => !v)}>
          Reset password
        </Button>
      </div>

      {resetting && (
        <div className="border-t border-charcoal/8 pt-3">
          <ResetPasswordForm userId={user.id} onDone={() => setResetting(false)} />
        </div>
      )}
    </div>
  );
}

export function AccountsTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <IconSearch size={15} stroke={2} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-8"
            aria-label="Search accounts"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setRoleFilter(filter.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === filter.key ? "bg-charcoal text-offwhite" : "bg-white text-charcoal hover:bg-white/70"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} of {users.length} accounts
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">No accounts match this search.</p>
        ) : (
          filtered.map((user) => <AccountRow key={user.id} user={user} isSelf={user.id === currentUserId} />)
        )}
      </div>
    </div>
  );
}
