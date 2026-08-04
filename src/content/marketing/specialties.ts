import { IconMicrophone, IconHandStop, IconHeart, IconClockHour4 } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

export interface SpecialtyCard {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  imageSrc?: string;
}

export const SPECIALTY_CARDS: SpecialtyCard[] = [
  {
    icon: IconMicrophone,
    title: "Speech Therapy",
    description: "Support for articulation, stuttering, and expressive-language delays.",
    imageSrc: "/images/specialty-speech-therapy.png",
  },
  {
    icon: IconHandStop,
    title: "Occupational Therapy",
    description: "Sensory processing and fine-motor skill development for everyday independence.",
    imageSrc: "/images/specialty-occupational-therapy.png",
  },
  {
    icon: IconHeart,
    title: "ABA Therapy",
    description: "Structured, evidence-based support for behavioral and social-skill goals.",
  },
  {
    icon: IconClockHour4,
    title: "Developmental Psychology",
    description: "Early-childhood milestone assessment and school-readiness support.",
  },
];
