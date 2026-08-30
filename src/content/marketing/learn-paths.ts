import { IconEye, IconClipboardList, IconHeartHandshake } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * "Start here" paths on /learn -- curated entry points shaped like the state
 * a parent actually arrives in, not a category taxonomy. Each path resolves
 * to a set of existing `learning_categories` names (no schema change); the
 * /learn page filters the guide grid to articles in those categories when
 * `?path=<slug>` is set.
 */
export interface LearnPath {
  slug: string;
  title: string;
  blurb: string;
  icon: ComponentType<IconProps>;
  categories: string[];
}

export const LEARN_PATHS: LearnPath[] = [
  {
    slug: "just-noticed",
    title: "I've just noticed something",
    blurb: "Speech, focus, sensory, social — what's typical at this age, and what's worth a closer look.",
    icon: IconEye,
    categories: ["Autism", "ADHD", "Dyslexia", "Sensory processing"],
  },
  {
    slug: "have-a-diagnosis",
    title: "We have a diagnosis",
    blurb: "What the next few weeks look like, and how to talk about it at home and at school.",
    icon: IconClipboardList,
    categories: ["Autism", "ADHD", "Dyslexia", "Getting started"],
  },
  {
    slug: "working-with-therapist",
    title: "We're working with a therapist",
    blurb: "Getting the most out of sessions, progress reports, and payments on Hayven.",
    icon: IconHeartHandshake,
    categories: ["Getting started", "Lagos resources"],
  },
];

export function getLearnPath(slug: string | undefined): LearnPath | undefined {
  return LEARN_PATHS.find((p) => p.slug === slug);
}
