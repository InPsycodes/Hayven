import type { StaticImageData } from "next/image";
import { IconMessageCircleHeart, IconSchool, type Icon as TablerIcon } from "@tabler/icons-react";

import earlyYearsImage from "../../../public/images/about-family-session.webp";
import youngChildImage from "../../../public/images/quote-breather-mother-child.webp";

/**
 * The Who We Serve age groups: the cards on /who-we-serve and one landing
 * page each at /who-we-serve/[slug]. Hayven serves ages 0-18 (confirmed by
 * Dr. Abike, 28 Oct 2026). The concerns and "who helps" lines are clinical
 * claims still awaiting her review -- change them here, not in the pages.
 */
export interface AgeConcern {
  title: string;
  detail: string;
  whoHelps: string;
}

export interface AgeGroup {
  slug: string;
  title: string;
  ages: string;
  /** Spelled out for the eyebrow and metadata, e.g. "ages 3 to 5". */
  agesLabel: string;
  /** One line on the /who-we-serve card. */
  cardLine: string;
  /** Three short tags on the /who-we-serve card. */
  cardConcerns: string[];
  headline: string;
  intro: string;
  concerns: AgeConcern[];
  article: { slug: string; title: string };
  /** Real photography where the site has it; the rest get a brand-toned stand-in until photos are sourced. */
  image?: { src: StaticImageData; alt: string; position: string };
  fallbackIcon: TablerIcon;
  /** Shows the call-112 notice: parents of teenagers are the likeliest to arrive mid-crisis. */
  showEmergencyNotice?: boolean;
}

export const AGE_GROUPS: AgeGroup[] = [
  {
    slug: "babies-and-toddlers",
    title: "Babies and toddlers",
    ages: "0–2",
    agesLabel: "ages 0 to 2",
    cardLine: "Notice early, act early. Help with late babbling, feeding, movement and the milestones that worry you.",
    cardConcerns: ["Late talking", "Feeding and eating", "Sitting, crawling, walking"],
    headline: "Small steps, early support.",
    intro:
      "The first two years shape so much. If something about your baby's development worries you, you do not have to wait and see.",
    concerns: [
      {
        title: "Late babbling or first words",
        detail: "Not babbling by about 12 months, or very few words by 18 months.",
        whoHelps: "Speech therapist",
      },
      {
        title: "Not responding to name or sounds",
        detail: "Little eye contact, smiling back or reaction when called.",
        whoHelps: "Psychologist",
      },
      {
        title: "Feeding difficulties",
        detail: "Trouble sucking, chewing or moving to solid food.",
        whoHelps: "Speech or occupational therapist",
      },
      {
        title: "Late sitting, crawling or walking",
        detail: "Or unusual stiffness or floppiness.",
        whoHelps: "Occupational therapist",
      },
      {
        title: "Hard to soothe",
        detail: "Very unsettled sleep or crying that wears the family down.",
        whoHelps: "Psychologist",
      },
    ],
    article: { slug: "child-not-talking-as-much", title: "My child isn't talking as much as others their age" },
    image: {
      src: earlyYearsImage,
      alt: "A toddler stacking cups during a session with her mother and a clinician",
      position: "60% 50%",
    },
    fallbackIcon: IconMessageCircleHeart,
  },
  {
    slug: "young-children",
    title: "Young children",
    ages: "3–5",
    agesLabel: "ages 3 to 5",
    cardLine: "Ready for school and for friends. Support with speech, play, big feelings and getting through the day.",
    cardConcerns: ["Speech and talking", "Big feelings and behaviour", "Play and social skills"],
    headline: "Growing into big feelings and new words.",
    intro:
      "These years bring talking, playing and making friends. When any of it feels harder than it should, a verified professional can help you understand why and what to do next.",
    concerns: [
      {
        title: "Speech that is hard to understand",
        detail: "Few words for their age, sounds that come out wrong, or stuttering that is not easing.",
        whoHelps: "Speech therapist",
      },
      {
        title: "Big feelings and meltdowns",
        detail: "Tantrums that are frequent, long or intense, and hard to calm.",
        whoHelps: "Psychologist or ABA therapist",
      },
      {
        title: "Play and making friends",
        detail: "Prefers to play alone, finds sharing or taking turns very hard.",
        whoHelps: "Psychologist",
      },
      {
        title: "Possible signs of autism",
        detail: "Repetitive play, strong need for routine, or little eye contact.",
        whoHelps: "Psychologist for an assessment",
      },
      {
        title: "Sensory sensitivities",
        detail: "Strong reactions to noise, clothing, textures or certain foods.",
        whoHelps: "Occupational therapist",
      },
    ],
    article: { slug: "signs-of-autism-early-childhood", title: "Early signs of autism, explained without the jargon" },
    image: { src: youngChildImage, alt: "A young boy building a block tower with his mother", position: "78% 55%" },
    fallbackIcon: IconMessageCircleHeart,
  },
  {
    slug: "school-age",
    title: "School age",
    ages: "6–12",
    agesLabel: "ages 6 to 12",
    cardLine: "Help them learn, focus and fit in, at home and in the classroom.",
    cardConcerns: ["Attention and focus", "Reading and learning", "Making friends"],
    headline: "Helping them thrive in and out of the classroom.",
    intro:
      "School asks a lot of children: focus, reading, friendships, sitting still. If your child is struggling, the right support can make each day easier for them and for you.",
    concerns: [
      {
        title: "Attention and focus",
        detail: "Easily distracted, restless, or unfinished work at home and school.",
        whoHelps: "Psychologist",
      },
      {
        title: "Reading and learning",
        detail: "Reading, spelling or maths much harder than for classmates.",
        whoHelps: "Psychologist",
      },
      {
        title: "Making and keeping friends",
        detail: "Left out, misreads social cues, or conflict with other children.",
        whoHelps: "Psychologist",
      },
      {
        title: "Worry and fears",
        detail: "Stomach aches before school, avoiding new things, or many fears.",
        whoHelps: "Psychologist",
      },
      {
        title: "Handwriting and coordination",
        detail: "Messy or tiring handwriting, clumsy, finds sport hard.",
        whoHelps: "Occupational therapist",
      },
    ],
    article: { slug: "adhd-or-just-a-lot-of-energy", title: "Is it ADHD, or is my child just a lot of energy?" },
    fallbackIcon: IconSchool,
  },
  {
    slug: "teenagers",
    title: "Teenagers",
    ages: "13–18",
    agesLabel: "ages 13 to 18",
    cardLine: "Steady support through the changes of adolescence, with a psychologist who listens.",
    cardConcerns: ["Worry and low mood", "Autism and ADHD support", "School pressure"],
    headline: "Someone in their corner through the teenage years.",
    intro:
      "Adolescence brings exams, changing friendships and big questions about who they are. A psychologist can give your teenager a safe place to talk, and give you guidance too.",
    concerns: [
      {
        title: "Anxiety and worry",
        detail: "Constant worry, panic, or avoiding school and people.",
        whoHelps: "Psychologist",
      },
      {
        title: "Low mood",
        detail: "Withdrawn, irritable, losing interest, or changes in sleep and appetite.",
        whoHelps: "Psychologist",
      },
      {
        title: "Exam and school pressure",
        detail: "Stress around WAEC, NECO and JAMB, or falling behind.",
        whoHelps: "Psychologist",
      },
      {
        title: "Autism and ADHD in the teen years",
        detail: "Support with independence, organisation and friendships.",
        whoHelps: "Psychologist or ABA therapist",
      },
      {
        title: "Confidence and self-esteem",
        detail: "Harsh on themselves, body image worries, or peer pressure.",
        whoHelps: "Psychologist",
      },
    ],
    article: { slug: "talking-to-your-child-about-therapy", title: "How to talk to your child about starting therapy" },
    fallbackIcon: IconMessageCircleHeart,
    showEmergencyNotice: true,
  },
];

export function getAgeGroup(slug: string): AgeGroup | undefined {
  return AGE_GROUPS.find((group) => group.slug === slug);
}
