import { IconShieldCheck, IconCalendarCheck, IconBellRinging, IconVideo } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

export interface TrustItem {
  icon: ComponentType<IconProps>;
  label: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  { icon: IconShieldCheck, label: "Admin-verified credentials" },
  { icon: IconCalendarCheck, label: "Book in minutes" },
  { icon: IconBellRinging, label: "Reminders 24h before every session" },
  // Reworded from "Video consultations included" -- V1 has no native video,
  // it hands off to a Zoom/Meet link instead.
  { icon: IconVideo, label: "Virtual sessions supported" },
];
