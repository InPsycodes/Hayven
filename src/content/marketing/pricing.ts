import { IconUser, IconEye, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

export interface PricingPoint {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
}

// Every point describes the real, already-shipped payment mechanics (see
// src/lib/payments/actions.ts -- the amount charged is always exactly
// therapist_profiles.price_per_session, with no markup applied anywhere in
// that flow) rather than a specific price or range, since there's no real
// pricing data on the platform yet to honestly cite a number. The sample
// card in the Pricing component shows the rate as a redacted placeholder
// for the same reason.
export const PRICING_POINTS: PricingPoint[] = [
  {
    icon: IconUser,
    title: "Set by the therapist",
    body: "The therapist chooses their rate. No hidden platform markup.",
  },
  {
    icon: IconEye,
    title: "Visible upfront",
    body: "You see the session price before you book, every time.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "Filter by what fits",
    body: "Search therapists by budget, specialty and format.",
  },
];
