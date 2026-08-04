/**
 * Learning Center content. Not part of the backend data model (the Learning
 * Center is a public content library, not an API-spec entity) -- kept as
 * static editorial fixtures separate from src/data/fixtures/.
 */
export interface Article {
  slug: string;
  category: string;
  title: string;
  readTime: string;
  excerpt: string;
  reviewedBy?: string;
}

export const CATEGORIES = [
  "All",
  "Autism",
  "ADHD",
  "Dyslexia",
  "Sensory processing",
  "Getting started",
  "Lagos resources",
] as const;

export const FEATURED_ARTICLE: Article = {
  slug: "child-not-talking-as-much",
  category: "Getting started",
  title: "My child isn't talking as much as others their age -- what should I actually do?",
  readTime: "6 min read",
  excerpt:
    "A calm, practical first step for parents noticing a speech gap -- what's worth watching for, and when to talk to a specialist.",
  reviewedBy: "Reviewed by a licensed speech-language pathologist",
};

export const ARTICLES: Article[] = [
  FEATURED_ARTICLE,
  {
    slug: "signs-of-autism-early-childhood",
    category: "Autism",
    title: "Early signs of autism spectrum differences, explained without the jargon",
    readTime: "8 min read",
    excerpt: "What to look for at different ages, and why an earlier conversation helps.",
  },
  {
    slug: "adhd-or-just-a-lot-of-energy",
    category: "ADHD",
    title: "Is it ADHD, or is my child just a lot of energy?",
    readTime: "5 min read",
    excerpt: "The difference between typical childhood energy and patterns worth assessing.",
  },
  {
    slug: "dyslexia-warning-signs",
    category: "Dyslexia",
    title: "Warning signs of dyslexia before a formal diagnosis",
    readTime: "7 min read",
    excerpt: "Reading struggles that are developmentally normal, and ones that aren't.",
  },
  {
    slug: "sensory-overload-what-it-looks-like",
    category: "Sensory processing",
    title: "What sensory overload actually looks like in young children",
    readTime: "6 min read",
    excerpt: "Meltdowns, shutdowns, and the sensory triggers parents often miss.",
  },
  {
    slug: "first-therapy-session-what-to-expect",
    category: "Getting started",
    title: "What to expect at your child's first therapy session",
    readTime: "4 min read",
    excerpt: "A walkthrough of what actually happens in the room, so nothing feels unfamiliar.",
  },
  {
    slug: "finding-verified-therapists-lagos",
    category: "Lagos resources",
    title: "How credential verification works for therapists practicing in Lagos",
    readTime: "5 min read",
    excerpt: "Why Nigeria's verification landscape is different, and what Hayven actually checks.",
  },
  {
    slug: "talking-to-your-child-about-therapy",
    category: "Getting started",
    title: "How to talk to your child about starting therapy",
    readTime: "5 min read",
    excerpt: "Age-appropriate language that keeps the first session from feeling scary.",
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
