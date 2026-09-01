"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { SessionType } from "@/data/types";

export interface BookingDraft {
  therapistId?: string;
  childId?: string;
  sessionType?: SessionType;
  slotId?: string;
  /** Real booking id, set once the booking has been created as pending_payment. */
  bookingId?: string;
}

interface BookingStoreState {
  draft: BookingDraft;
  /** False until zustand's persist middleware has actually read sessionStorage back in. */
  hasHydrated: boolean;
  setDraft: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Client-side-only booking draft, carried across the 3-step booking flow.
 * Persisted to sessionStorage so a refresh mid-flow doesn't lose state --
 * scoped to the tab, since there's no server-persisted draft (a real
 * booking row + payment lock does exist from the "continue to payment"
 * step onward, see src/lib/booking/actions.ts and 0053_booking_payment_
 * lock.sql, but the client-side step state itself is tab-local).
 *
 * hasHydrated exists because persist's rehydration from sessionStorage is
 * asynchronous: on first mount `draft` is genuinely `{}` for one render
 * before the real persisted value loads in. A component that redirects
 * whenever `draft` looks incomplete was doing that check on the empty
 * pre-hydration render too, bouncing a real, valid, mid-flow draft back to
 * step one on every page refresh -- confirmed as a real bug by two
 * independent live pre-launch audits. Consumers must wait for
 * hasHydrated before treating an "incomplete" draft as real.
 */
export const useBookingStore = create<BookingStoreState>()(
  persist(
    (set) => ({
      draft: {},
      hasHydrated: false,
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: {} }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "hayven-booking-draft",
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
