import { IconShieldCheck, IconLock, IconMapPin } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

export interface TrustSafetyPoint {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
}

// Every point here is a real, already-shipped property of the platform --
// nothing aspirational. "Private by design" specifically describes Hayven's
// actual RLS-enforced data isolation (see supabase/migrations), not just a
// policy promise.
export const TRUST_SAFETY_POINTS: TrustSafetyPoint[] = [
  {
    icon: IconShieldCheck,
    title: "Verified, always",
    body: "No therapist's profile goes live until Hayven's admin team confirms their credentials directly with their professional body.",
  },
  {
    icon: IconLock,
    title: "Private by design",
    body: "Every account only ever sees the children and records it's actually authorized for -- enforced at the database level, not left to app-level trust.",
  },
  {
    icon: IconMapPin,
    title: "Built for Nigerian families",
    body: "Priced in naira, based in Lagos, and designed around how Nigerian families actually access child-focused care.",
  },
];
