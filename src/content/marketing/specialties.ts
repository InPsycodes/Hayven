import { IconMicrophone, IconHandStop, IconHeart, IconClockHour4 } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";
import type { StaticImageData } from "next/image";

import speechTherapyImage from "../../../public/images/specialty-speech-therapy.jpg";
import occupationalTherapyImage from "../../../public/images/specialty-occupational-therapy.jpg";
import abaTherapyImage from "../../../public/images/specialty-aba-therapy.jpg";
import developmentalPsychologyImage from "../../../public/images/specialty-developmental-psychology.jpg";

export interface SpecialtyCard {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  imageSrc?: StaticImageData;
}

export const SPECIALTY_CARDS: SpecialtyCard[] = [
  {
    icon: IconMicrophone,
    title: "Speech Therapy",
    description: "Support for articulation, stuttering, and expressive-language delays.",
    imageSrc: speechTherapyImage,
  },
  {
    icon: IconHandStop,
    title: "Occupational Therapy",
    description: "Sensory processing and fine-motor skill development for everyday independence.",
    imageSrc: occupationalTherapyImage,
  },
  {
    icon: IconHeart,
    title: "ABA Therapy",
    description: "Structured, evidence-based support for behavioral and social-skill goals.",
    imageSrc: abaTherapyImage,
  },
  {
    icon: IconClockHour4,
    title: "Developmental Psychology",
    description: "Early-childhood milestone assessment and school-readiness support.",
    imageSrc: developmentalPsychologyImage,
  },
];
