"use client";

import { useActionState } from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { joinLaunchWaitlist, type WaitlistState } from "@/lib/waitlist/actions";

const initialState: WaitlistState = {};

/**
 * Shown on /search while no therapist is live at all (not for a filtered
 * search with no matches). Says what's happening, takes an email for when
 * therapists go live, and points to the two things that work today.
 */
export function LaunchPanel({ specialty }: { specialty?: string }) {
  const [state, formAction, isPending] = useActionState(joinLaunchWaitlist, initialState);

  return (
    <div className="grid gap-8 rounded-2xl bg-[#1f1b18] p-7 text-canvas-white md:grid-cols-[1.25fr_1fr] md:p-9">
      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl leading-snug text-balance">We&apos;re verifying our first therapists now.</h2>
        <p className="text-sm leading-relaxed text-canvas-white/70">
          Every therapist on Hayven is checked with their professional body and must be insured before they&apos;re
          listed. Leave your email and we&apos;ll tell you as soon as therapists are available.
        </p>

        {state.ok ? (
          <p role="status" className="mt-2 rounded-lg bg-white/10 px-4 py-3 text-sm text-canvas-white">
            You&apos;re on the list. We&apos;ll email you once, when therapists go live.
          </p>
        ) : (
          <form action={formAction} className="mt-2 flex flex-col gap-2 sm:flex-row">
            {specialty && <input type="hidden" name="specialty" value={specialty} />}
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 w-full min-w-0 shrink-0 rounded-lg sm:w-auto sm:flex-1 border border-white/15 bg-white/5 px-4 text-sm text-canvas-white placeholder:text-canvas-white/40 focus-visible:border-white/40 focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="h-11 shrink-0 rounded-lg bg-terracotta-fill px-5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Tell me when"}
            </button>
          </form>
        )}
        {state.error && <p className="text-sm text-rust-light">{state.error}</p>}
      </div>

      <div className="flex flex-col gap-4 border-white/10 md:border-l md:pl-8">
        <ol className="flex flex-col gap-3 text-sm text-canvas-white/80">
          <li className="grid grid-cols-[1.75rem_1fr] gap-1">
            <span className="font-mono text-rust-light">01</span>Take the 2-minute quiz so we know what your child needs.
          </li>
          <li className="grid grid-cols-[1.75rem_1fr] gap-1">
            <span className="font-mono text-rust-light">02</span>Read the guides written with therapists in the meantime.
          </li>
          <li className="grid grid-cols-[1.75rem_1fr] gap-1">
            <span className="font-mono text-rust-light">03</span>We email you once, when therapists are live.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/needs-assessment"
            className="inline-flex items-center gap-1.5 rounded-lg bg-canvas-white px-4 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-canvas-white/85"
          >
            Take the quiz <IconArrowRight size={15} stroke={2} aria-hidden />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-canvas-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
          >
            Browse guides
          </Link>
        </div>
      </div>
    </div>
  );
}
