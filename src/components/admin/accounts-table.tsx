"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, initialsFromName } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { AdminUserRow, AdminAccountRoleFilter } from "@/lib/admin/queries";
import {
  setUserAccountStatus,
  resetUserAccountPassword,
  setUserSupervisorFlag,
  offboardTherapist,
  type OffboardResult,
} from "@/lib/admin/actions";

/** E12, external PRD review: the deliberate, permanent departure action --
 *  distinct from Suspend/Reactivate above, which stays a temporary,
 *  reversible hold. Requires an explicit confirm click since this cascades
 *  (ends assignments, cancels upcoming bookings with refunds queued,
 *  removes supervisor access) and can't be undone the way a re-suspend can. */
function OffboardControl({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OffboardResult | null>(null);
  const { guard, reset } = useSubmitGuard();

  if (result) {
    return (
      <p className="text-xs text-muted-foreground">
        Offboarded: {result.assignmentsEnded} assignment{result.assignmentsEnded === 1 ? "" : "s"} ended,{" "}
        {result.bookingsCancelled} booking{result.bookingsCancelled === 1 ? "" : "s"} cancelled (refunds queued in{" "}
        <a href="/admin/refunds" className="underline">
          Refunds
        </a>
        ){result.holdsReleased > 0 && (
          <>
            , {result.holdsReleased} unpaid hold{result.holdsReleased === 1 ? "" : "s"} released
          </>
        )}
        .
      </p>
    );
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
        Offboard
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-charcoal">
        Ends their active assignments, cancels upcoming confirmed bookings (refunds queued for you to send), and
        removes supervisor access. Clinical records stay attributed to them. This can&apos;t be undone.
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={guard(() =>
            startTransition(async () => {
              setError(null);
              const res = await offboardTherapist(userId);
              if (!res.ok) {
                setError(res.error);
                reset();
                return;
              }
              setResult(res.result);
            })
          )}
        >
          {isPending ? "Offboarding..." : "Confirm offboard"}
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-error-text">{error}</p>}
    </div>
  );
}

const ROLE_FILTERS: { key: AdminAccountRoleFilter; label: string }[] = [
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
  const { guard, reset } = useSubmitGuard();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={guard((e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await resetUserAccountPassword(userId, password);
          if (!result.ok) {
            setError(result.error);
            reset();
            return;
          }
          onDone();
        });
      })}
    >
      <Input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        aria-label="New password"
        className="w-56"
        autoFocus
      />
      <Button type="submit" size="sm" variant="accent" disabled={isPending}>
        {isPending ? "Saving..." : "Set password"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-error-text">{error}</p>}
    </form>
  );
}

function AccountRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [isRolePending, startRoleTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [localStatus, setLocalStatus] = useState(user.status);
  const [localIsSupervisor, setLocalIsSupervisor] = useState(user.isSupervisor);
  const [roleError, setRoleError] = useState<string | null>(null);
  const statusGuard = useSubmitGuard();
  const roleGuard = useSubmitGuard();
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const wasResetting = useRef(false);

  // Return focus to the trigger button once the inline reset-password form
  // closes (whether by finishing or Cancel) -- otherwise a keyboard user
  // loses their place and lands back at the top of the page.
  useEffect(() => {
    if (wasResetting.current && !resetting) {
      resetButtonRef.current?.focus();
    }
    wasResetting.current = resetting;
  }, [resetting]);

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
          {localIsSupervisor && <StatusBadge tone="sage">Supervisor</StatusBadge>}
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
          onClick={statusGuard.guard(() =>
            startTransition(async () => {
              const nextStatus = suspended ? "active" : "suspended";
              const result = await setUserAccountStatus(user.id, nextStatus);
              if (result.ok) setLocalStatus(nextStatus);
              statusGuard.reset();
            })
          )}
        >
          {isPending ? "Saving..." : suspended ? "Reactivate" : "Suspend"}
        </Button>
        <Button ref={resetButtonRef} size="sm" variant="ghost" disabled={isSelf} onClick={() => setResetting((v) => !v)}>
          Reset password
        </Button>
        {user.role === "therapist" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isRolePending || isSelf}
            onClick={roleGuard.guard(() =>
              startRoleTransition(async () => {
                setRoleError(null);
                const makeSupervisor = !localIsSupervisor;
                const result = await setUserSupervisorFlag(user.id, makeSupervisor);
                if (result.ok) setLocalIsSupervisor(makeSupervisor);
                else setRoleError(result.error);
                roleGuard.reset();
              })
            )}
          >
            {isRolePending ? "Saving..." : localIsSupervisor ? "Remove supervisor" : "Make supervisor"}
          </Button>
        )}
        {user.role === "therapist" && !isSelf && <OffboardControl userId={user.id} />}
      </div>

      {roleError && <p className="text-xs text-error-text">{roleError}</p>}

      {resetting && (
        <div className="border-t border-charcoal/8 pt-3">
          <ResetPasswordForm userId={user.id} onDone={() => setResetting(false)} />
        </div>
      )}
    </div>
  );
}

function accountsHref({ role, q, page }: { role: AdminAccountRoleFilter; q: string; page: number }) {
  const params = new URLSearchParams();
  if (role !== "all") params.set("role", role);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/accounts?${query}` : "/admin/accounts";
}

/**
 * One page of accounts. Search, role filter and page all live in the URL and
 * are applied by the server (see getUsersForAdminPage), so this only renders
 * what it's given -- a page can be reloaded or shared, and search covers every
 * account rather than just the ones already loaded.
 */
export function AccountsTable({
  users,
  currentUserId,
  total,
  page,
  pageSize,
  role,
  search,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  total: number;
  page: number;
  pageSize: number;
  role: AdminAccountRoleFilter;
  search: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const isFiltered = role !== "all" || search !== "";
  const pagerLink = "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-charcoal transition-colors hover:bg-white/70";
  const pagerOff = "rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground/60";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/admin/accounts" method="get" role="search" className="flex w-full items-center gap-2 sm:max-w-sm">
          {role !== "all" && <input type="hidden" name="role" value={role} />}
          <div className="relative flex-1">
            <IconSearch size={15} stroke={2} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={search}
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search by name or email"
              className="pl-8"
              aria-label="Search accounts"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {search && (
            <Link href={accountsHref({ role, q: "", page: 1 })} className="text-xs text-muted-foreground hover:underline">
              Clear
            </Link>
          )}
        </form>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={accountsHref({ role: filter.key, q: search, page: 1 })}
              aria-current={role === filter.key ? "true" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                role === filter.key ? "bg-charcoal text-offwhite" : "bg-white text-charcoal hover:bg-white/70"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {total === 0
          ? isFiltered
            ? "No matching accounts"
            : "No accounts"
          : `Showing ${first}–${last} of ${total} ${isFiltered ? "matching " : ""}account${total === 1 ? "" : "s"}`}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {users.length === 0 ? (
          <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">No accounts match this search.</p>
        ) : (
          users.map((user) => <AccountRow key={user.id} user={user} isSelf={user.id === currentUserId} />)
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={accountsHref({ role, q: search, page: page - 1 })} className={pagerLink}>
              Previous
            </Link>
          ) : (
            <span className={pagerOff}>Previous</span>
          )}
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={accountsHref({ role, q: search, page: page + 1 })} className={pagerLink}>
              Next
            </Link>
          ) : (
            <span className={pagerOff}>Next</span>
          )}
        </nav>
      )}
    </div>
  );
}
