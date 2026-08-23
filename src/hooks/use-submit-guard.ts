"use client";

import { useRef, useCallback } from "react";

/**
 * Blocks a handler from running a second time before its first call has
 * finished -- `disabled={isPending}` from useTransition alone doesn't close
 * this window: two click events dispatched before React's first re-render
 * commits (a fast double-click, or a scripted `.click(); .click()`) can both
 * reach the handler while `isPending` still reads false. This ref is
 * checked-and-set synchronously as the very first thing the guarded handler
 * does, before any state update or async work, so it can't be raced the
 * same way. Confirmed via the pre-launch audit's double-click test on the
 * payment button and admin suspend/reactivate actions.
 */
export function useSubmitGuard() {
  const blockedRef = useRef(false);

  const guard = useCallback(<Args extends unknown[]>(fn: (...args: Args) => void) => {
    return (...args: Args) => {
      if (blockedRef.current) return;
      blockedRef.current = true;
      fn(...args);
    };
  }, []);

  const reset = useCallback(() => {
    blockedRef.current = false;
  }, []);

  return { guard, reset };
}
