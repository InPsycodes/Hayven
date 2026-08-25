import { IconUserDollar, IconEye, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

export interface PricingPoint {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
}

// Every point here describes the real, already-shipped payment mechanics
// (see src/lib/payments/actions.ts -- the amount charged is always exactly
// therapist_profiles.price_per_session, no markup applied anywhere in that
// flow) rather than any specific price range, since there's no real pricing
// data on the platform yet to honestly cite a number.
export const PRICING_POINTS: PricingPoint[] = [
  {
    icon: IconUserDollar,
    title: "Set by your therapist",
    body: "No platform fee added on top. The price you see is exactly what your therapist charges for the session.",
  },
  {
    icon: IconEye,
    title: "Visible before you book",
    body: "Every profile shows the session rate upfront, whether you're browsing, searching, or matched through the quiz.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "Filter by what fits",
    body: "Search by budget alongside specialty and format, so you only see therapists who work for your family.",
  },
];
