import {
  IconPuzzle,
  IconBolt,
  IconBook2,
  IconWaveSine,
  IconFlag,
  IconMapPin,
  IconStethoscope,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

export interface LearnTopicMeta {
  icon: ComponentType<IconProps>;
  /** Icon-tile background/foreground for the thumbnail. */
  tileClass: string;
  /** Tag chip background/foreground shown on each article row. */
  chipClass: string;
}

// Tonal reuse of the existing brand tokens (terracotta/amber/success/rust-light
// plus a neutral) instead of introducing new hues -- enough variation to tell
// categories apart without breaking the site's disciplined warm palette.
export const LEARN_TOPIC_META: Record<string, LearnTopicMeta> = {
  Autism: {
    icon: IconPuzzle,
    tileClass: "bg-terracotta text-canvas-white",
    chipClass: "bg-terracotta text-canvas-white",
  },
  ADHD: {
    icon: IconBolt,
    tileClass: "bg-amber/15 text-amber",
    chipClass: "bg-amber/15 text-amber",
  },
  Dyslexia: {
    icon: IconBook2,
    tileClass: "bg-success/15 text-success",
    chipClass: "bg-success/15 text-success",
  },
  "Sensory processing": {
    icon: IconWaveSine,
    tileClass: "bg-rust-light/20 text-rust-dark",
    chipClass: "bg-rust-light/20 text-rust-dark",
  },
  "Getting started": {
    icon: IconFlag,
    tileClass: "border border-border bg-canvas-white text-ink-soft",
    chipClass: "bg-canvas-white text-ink-soft ring-1 ring-border",
  },
  "Lagos resources": {
    icon: IconMapPin,
    tileClass: "bg-terracotta/10 text-rust-dark",
    chipClass: "bg-terracotta/10 text-rust-dark",
  },
  "For therapists": {
    icon: IconStethoscope,
    tileClass: "bg-charcoal text-canvas-white",
    chipClass: "bg-charcoal text-canvas-white",
  },
};
