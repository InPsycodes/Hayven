"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { SessionType } from "@/data/types";

export interface BookingDraft {
  therapistId?: string;
  childId?: string;
  sessionType?: SessionType;
  slotId?: string;
  paymentMethod?: "card" | "bank_transfer" | "ussd";
  /** Real booking id, set once a real (non-mock) booking has been created as pending_payment. */
  bookingId?: string;
}

interface BookingStoreState {
  draft: BookingDraft;
  setDraft: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
}

/**
 * Client-side-only booking draft, carried across the 3-step booking flow.
 * Persisted to sessionStorage so a refresh mid-flow doesn't lose state, but
 * scoped to the tab -- there's no real backend booking record until the
 * confirmation step "completes" it against the mock data layer.
 */
export const useBookingStore = create<BookingStoreState>()(
  persist(
    (set) => ({
      draft: {},
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: {} }),
    }),
    {
      name: "hayven-booking-draft",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
