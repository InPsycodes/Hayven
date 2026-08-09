/**
 * Learning Center content. Not part of the backend data model (the Learning
 * Center is a public content library, not an API-spec entity) -- kept as
 * static editorial fixtures separate from src/data/fixtures/.
 */
export type Audience = "parent" | "therapist";

export interface Article {
  slug: string;
  audience: Audience;
  category: string;
  title: string;
  readTime: string;
  excerpt: string;
  body: string[];
  reviewedBy?: string;
}

export const PARENT_CATEGORIES = [
  "All",
  "Autism",
  "ADHD",
  "Dyslexia",
  "Sensory processing",
  "Getting started",
  "Lagos resources",
] as const;

export const THERAPIST_CATEGORIES = ["All", "For therapists"] as const;

// Kept for any call site still expecting the old flat list (parent categories, unchanged shape).
export const CATEGORIES = PARENT_CATEGORIES;

export const FEATURED_ARTICLE: Article = {
  slug: "child-not-talking-as-much",
  audience: "parent",
  category: "Getting started",
  title: "My child isn't talking as much as others their age: what should I actually do?",
  readTime: "6 min read",
  excerpt:
    "A calm, practical first step for parents noticing a speech gap: what's worth watching for, and when to talk to a specialist.",
  reviewedBy: "Reviewed by a licensed speech-language pathologist",
  body: [
    "Every child's language develops on their own timeline, so a slower start isn't automatically cause for alarm — but there are a few things worth actually watching for rather than waiting out.",
    "By 18 months, most children can say a handful of single words. By 2, that usually grows into short two-word phrases (\"more juice,\" \"mummy go\"). By 3, most children can be understood by people outside their immediate family most of the time. These are ranges, not deadlines — some perfectly typical kids are just a few months behind on all three.",
    "What's worth a closer look: no words at all by 18 months, no two-word phrases by 2.5, or a child who seems to understand what's said to them but struggles to respond in any way (pointing, gesturing, sounds) — not just words. A regression, where a child had words and then stopped using them, is always worth a conversation sooner rather than later.",
    "What to actually do: start with your pediatrician at a routine visit, but don't feel like you need to wait for one if something feels off. An initial screening with a speech-language pathologist doesn't require a referral in most cases, and it's a conversation, not a diagnosis — it's the fastest way to find out whether what you're noticing is a normal variation or something worth addressing now, while early intervention still has the most room to help.",
    "In the meantime, narrate what you're doing together, follow their lead in play, and give them time to respond before jumping in for them. None of that replaces an assessment, but it's a genuinely useful way to spend the weeks before one.",
  ],
};

export const FEATURED_THERAPIST_ARTICLE: Article = {
  slug: "using-progress-charts-in-family-conversations",
  audience: "therapist",
  category: "For therapists",
  title: "Turning your progress charts into a conversation parents actually understand",
  readTime: "5 min read",
  excerpt: "A chart that makes perfect sense in session can look like noise to a parent seeing it cold. What helps it land.",
  body: [
    "A chart that makes perfect sense to you in a session can look like noise to a parent seeing it for the first time. A few things that consistently help it land:",
    "Lead with the trend, not the data. \"Sessions attended is climbing steadily since March\" lands before the parent has processed the axis labels. Point at the shape first, numbers second.",
    "Name what changed, not just that something changed. If a goal-progress line jumps after a specific week, say what happened around then — a new strategy, a change at home, a different reinforcer. Parents remember the story, not the percentage.",
    "Don't over-explain a flat line. A plateau reads as failure to a parent who doesn't do this for a living. Frame it in terms of what's typical for this stage of the goal, if that's true — and if it isn't, that's worth naming directly rather than smoothing over.",
    "Bring one chart, not six. Hayven generates several (attendance, behaviour frequency and trend, goal progress, skill acquisition, reinforcer effectiveness) — pick the one that answers the question this particular family actually has this month.",
  ],
};

export const ARTICLES: Article[] = [
  FEATURED_ARTICLE,
  FEATURED_THERAPIST_ARTICLE,
  {
    slug: "signs-of-autism-early-childhood",
    audience: "parent",
    category: "Autism",
    title: "Early signs of autism spectrum differences, explained without the jargon",
    readTime: "8 min read",
    excerpt: "What to look for at different ages, and why an earlier conversation helps.",
    body: [
      "Autism looks different in every child, so there's no single sign that confirms or rules it out. What actually helps is knowing which patterns are worth a conversation with a specialist — not as a checklist for diagnosing at home, but as a way to trust what you're noticing.",
      "By 12 months: limited or no response to their name being called, little to no pointing or waving, and not sharing enjoyment by looking back and forth between you and something interesting (what's called joint attention).",
      "By 18-24 months: not yet combining words in the way you'd expect for their age, repeating words or phrases without using them to communicate (echolalia), strong preference for lining up or ordering objects over pretend play, and noticeably intense reactions to changes in routine.",
      "At any age: differences in eye contact that feel consistent rather than occasional, repetitive movements (hand-flapping, rocking, spinning), and a narrow, intense focus on specific topics or objects.",
      "None of these individually mean anything definitive — plenty of typically developing children show one or two at some point. What matters more is a cluster of several, persisting over time, and noticeably affecting how your child plays, communicates, or connects with others.",
      "If a few of these sound familiar, the next step is a developmental screening, not a label. A specialist can tell you whether what you're seeing warrants a fuller evaluation — and if it's autism, an earlier conversation means earlier support, which is consistently linked to better outcomes. It's never too early to ask, and asking doesn't commit you to anything except more information.",
    ],
  },
  {
    slug: "adhd-or-just-a-lot-of-energy",
    audience: "parent",
    category: "ADHD",
    title: "Is it ADHD, or is my child just a lot of energy?",
    readTime: "5 min read",
    excerpt: "The difference between typical childhood energy and patterns worth assessing.",
    body: [
      "Almost every young child is inattentive, impulsive, or full of energy sometimes — that's not a red flag on its own, it's childhood. The distinction clinicians actually look for isn't how much energy a child has, it's whether attention and impulse-control struggles show up consistently across more than one setting.",
      "A high-energy child who's a handful at home but settles and focuses fine at school is very likely just a high-energy child. A child who struggles to sit still, follow multi-step instructions, or wait their turn both at home and at school — and has for six months or more — is showing the pattern worth actually assessing.",
      "Other things that tend to point toward ADHD rather than typical energy: consistently losing items needed for tasks, seeming not to listen even when spoken to directly, starting tasks but rarely finishing them, and impulsivity that causes real problems (interrupting constantly, difficulty waiting, acting before thinking in ways that lead to accidents or conflict).",
      "Age matters too. What looks like inattention in a 4-year-old is often just age-typical — most 4-year-olds have short attention spans. The same pattern in a 9-year-old, especially if it's affecting schoolwork or friendships, is more worth a closer look.",
      "If it's showing up in more than one setting and it's been going on for a while, an evaluation (usually starting with input from both parents and teachers) is the way to actually find out — not a label to fear, just information that opens up support if it's needed.",
    ],
  },
  {
    slug: "dyslexia-warning-signs",
    audience: "parent",
    category: "Dyslexia",
    title: "Warning signs of dyslexia before a formal diagnosis",
    readTime: "7 min read",
    excerpt: "Reading struggles that are developmentally normal, and ones that aren't.",
    body: [
      "Learning to read is genuinely hard, and most children stumble through parts of it — that alone isn't a sign of anything. Dyslexia-specific signs tend to show up earlier than reading itself, in how a child hears and plays with the sounds inside words.",
      "Before school age: trouble learning nursery rhymes, difficulty noticing that words rhyme, and a family history of reading difficulty (dyslexia runs in families more than most learning differences do).",
      "In early reading years: real difficulty connecting letters to their sounds despite repeated practice, guessing at words from their first letter or the picture rather than sounding them out, reversing letters or numbers past the age when that's typical (occasional reversals up to around age 7 are normal), and reading that's noticeably slower or more effortful than a child's spoken vocabulary would suggest.",
      "A useful gap to watch for: a child who speaks with an age-appropriate (or advanced) vocabulary but whose reading is well behind that. That mismatch — strong oral language, struggling written language — is one of the more reliable early flags.",
      "If several of these are showing up and persisting despite normal classroom instruction, the next step is a formal evaluation, usually through the school or an educational psychologist. Earlier identification means earlier access to the specific, structured teaching approaches that actually work for dyslexic readers — waiting rarely helps and often just adds frustration.",
    ],
  },
  {
    slug: "sensory-overload-what-it-looks-like",
    audience: "parent",
    category: "Sensory processing",
    title: "What sensory overload actually looks like in young children",
    readTime: "6 min read",
    excerpt: "Meltdowns, shutdowns, and the sensory triggers parents often miss.",
    body: [
      "Sensory overload happens when a child's brain is taking in more sound, light, touch, or movement than it can process at once — and it can look like two very different things depending on the child.",
      "A meltdown is the loud version: crying, screaming, running, hitting, or otherwise visibly losing control. It's often mistaken for a tantrum, but the key difference is intent — a tantrum usually has a goal (getting a toy, avoiding a task) and responds to negotiation; a meltdown doesn't have a goal at all, it's an overwhelmed nervous system, and negotiating with it tends to make things worse, not better.",
      "A shutdown is the quiet version, and it's the one parents more often miss entirely: going still, unresponsive, avoiding eye contact, or seeming to \"check out\" of what's happening around them. It can look like defiance or daydreaming when it's actually the same overload, expressed inward instead of outward.",
      "Common triggers worth paying attention to: unexpected loud noises (hand dryers, blenders, crowded rooms), certain textures in clothing or food, bright or flickering lights, being touched unexpectedly, and transitions between activities, especially unplanned ones.",
      "What helps in the moment is different from what helps a tantrum: reducing input rather than adding conversation — moving to a quieter space, dimming lights, removing the immediate trigger — and giving the child time to recover before expecting them to talk about what happened.",
      "If this pattern is frequent and clearly tied to sensory input rather than typical toddler frustration, an occupational therapist who works in sensory processing can help identify specific triggers and build a plan around them.",
    ],
  },
  {
    slug: "first-therapy-session-what-to-expect",
    audience: "parent",
    category: "Getting started",
    title: "What to expect at your child's first therapy session",
    readTime: "4 min read",
    excerpt: "A walkthrough of what actually happens in the room, so nothing feels unfamiliar.",
    body: [
      "Once you've found a therapist on Hayven and booked a time, you'll get a confirmation once payment goes through — for a virtual session, a meeting link appears on that booking; for in-person, you'll have the therapist's location.",
      "The first session is almost never straight into \"treatment\" — it's an intake. The therapist is getting to know your child and building a picture of what's going on: your concerns, your child's history, what's already been tried, and how your child responds in the room itself. Expect more listening and observing than structured activity.",
      "For younger children, a lot of this happens through play rather than direct questions — a good therapist can learn as much from how a child plays as from what they say. Don't be surprised if the session looks informal; that's often deliberate.",
      "You'll usually be asked questions about developmental history, any prior evaluations, and what a typical day looks like at home. It's worth writing a few specific examples down beforehand (a recent hard morning, a specific interaction that worried you) — specifics are more useful to a therapist than general impressions.",
      "By the end, most therapists will give you a rough sense of what they're seeing and what the next few sessions will focus on, though a full picture usually takes a few sessions to form. If anything about the first session leaves you unsure, that's a completely reasonable thing to raise directly with the therapist — you can message them anytime through Hayven.",
    ],
  },
  {
    slug: "finding-verified-therapists-lagos",
    audience: "parent",
    category: "Lagos resources",
    title: "How credential verification works for therapists practicing in Lagos",
    readTime: "5 min read",
    excerpt: "Why Nigeria's verification landscape is different, and what Hayven actually checks.",
    body: [
      "Therapy credentialing in Nigeria doesn't work through one single national registry the way it does in some other countries — professional bodies vary by discipline, and verifying a practitioner often means checking the right body for their specific specialty.",
      "Every therapist on Hayven goes through the same process before their profile becomes visible to parents: they submit their credentials (membership or license number, issuing professional body, and supporting documentation) for review. Nothing about a therapist's profile is public until that review is complete.",
      "An admin checks the submission against the stated professional body before approving it. Once approved, a therapist's profile shows a verification badge naming that professional body directly, so you can see specifically what was checked rather than a generic \"verified\" label.",
      "If a submission needs more information, the therapist is asked to provide it before a decision is made — profiles aren't approved on partial information. You can always ask a therapist directly, through Hayven's messaging, what their specific credentials and specialty are; a verified badge is a starting point for trust, not a replacement for the conversation itself.",
    ],
  },
  {
    slug: "talking-to-your-child-about-therapy",
    audience: "parent",
    category: "Getting started",
    title: "How to talk to your child about starting therapy",
    readTime: "5 min read",
    excerpt: "Age-appropriate language that keeps the first session from feeling scary.",
    body: [
      "How you introduce therapy matters almost as much as the therapy itself — children pick up on tone quickly, and if it's framed as a consequence or a fix for something \"wrong\" with them, that framing tends to stick.",
      "For younger children (roughly under 6): keep it concrete and tied to something they already understand. \"We're going to see someone who has fun games to help you with talking\" or \"...to help your body feel calmer\" works better than abstract explanations. Avoid the word \"problem\" — try \"helper\" or \"someone who's good at this\" instead.",
      "For school-age children: they can usually handle a bit more honesty. \"You've been having a hard time with reading at school, and this person knows a lot about helping kids with that\" respects that they've likely already noticed the difficulty themselves. Let them ask questions, and it's fine to say \"I don't know\" to ones you can't answer yet.",
      "For older children and preteens: involve them more directly, even in choosing between therapists if that's practical. Framing it as their tool, not something being done to them, tends to reduce resistance — \"this is someone you get to talk to who won't tell your friends anything\" often lands better than a clinical explanation.",
      "Across every age: avoid using therapy as a threat (\"if you don't behave, you'll have to see the therapist\") even in a moment of frustration — it undoes the framing fast and is hard to walk back. And keep checking in casually after sessions start; \"how did it go, was it what you expected?\" a few times over the first month tells you a lot more than asking once.",
    ],
  },
  {
    slug: "writing-session-notes-parents-understand",
    audience: "therapist",
    category: "For therapists",
    title: "Writing session notes parents will actually read",
    readTime: "4 min read",
    excerpt: "Plain language over clinical shorthand — what to translate, and what to keep precise.",
    body: [
      "A note written for your own clinical record and a note written for a parent to actually read aren't the same document, even when they're describing the same session. Hayven's parent-facing report is a separate, plain-language summary from your own clinical notes for exactly this reason.",
      "Target-behaviour labels are the clearest example. \"Elopement\" or \"tantrum duration\" are precise, useful shorthand for your own records, but they read as cold or even alarming to a parent seeing them for the first time. Translate the behaviour into what it actually looked like and why it matters, not the clinical term for it.",
      "Keep specificity where it helps a parent act on it. \"Struggled with transitions\" is vague; \"had a hard time moving from playtime to cleanup, but recovered faster than last week\" gives a parent something concrete to notice at home and a sense of progress, not just a category.",
      "Don't flatten every session into good news. If something didn't go well, say so plainly and briefly — parents generally trust a therapist more, not less, for naming a hard session honestly rather than smoothing every note into positive framing.",
      "Lead with what a parent can actually do with the information. A note that ends with one specific, doable thing to try before the next session is more useful to most families than a longer summary with none.",
    ],
  },
  {
    slug: "what-hayven-verification-checks",
    audience: "therapist",
    category: "For therapists",
    title: "What Hayven's verification process checks, and why",
    readTime: "4 min read",
    excerpt: "What to submit, what a decision actually means, and when your profile goes live.",
    body: [
      "Your profile stays hidden from parent search until your credentials have been reviewed and approved — this applies to every therapist on Hayven, regardless of experience or specialty, since it's the thing parents are trusting when they book with someone they've never met.",
      "What to submit: your membership or license number, the professional body that issued it, and supporting documentation. Be specific about which professional body applies to your discipline — Nigeria doesn't have one single registry, so the review is only as accurate as what you submit.",
      "What the decision options actually mean: approved means your profile goes live immediately, with a badge naming your specific professional body. Flagged means more information is needed before a decision can be made — check your notifications, since you'll be told specifically what's missing. Rejected means the submission didn't meet verification as submitted; you can resubmit with corrected or additional information.",
      "There's no fixed review window quoted here deliberately, since giving you a number that isn't reliably true would be worse than not giving one — but your profile updates and you're notified the moment a decision is actually made, so there's nothing to check manually in the meantime.",
      "If you're ever unsure what's missing from a flagged submission, that's worth a direct message to Hayven's team rather than guessing and resubmitting the same thing twice.",
    ],
  },
  {
    slug: "getting-your-profile-noticed",
    audience: "therapist",
    category: "For therapists",
    title: "Getting your profile noticed by the right parents",
    readTime: "4 min read",
    excerpt: "What your bio, price, and location actually do for how parents find and choose you.",
    body: [
      "Once you're verified, three fields do most of the work in how parents find and choose you: your bio, your session price, and your location — all editable anytime from your Profile page.",
      "Your bio is the first thing a parent reads after your name and badge, and it's the part most therapists under-invest in. A bio that names specific specialties and the kind of family you work best with (\"I work mostly with early-elementary kids navigating a new diagnosis\") gives a parent something to match themselves against, far more than a general statement of credentials they've already seen in your badge.",
      "Price is a filter, not just a number — parents searching often sort or filter by it directly. Setting it accurately for the value you offer matters more than setting it low; a price that doesn't match the experience described in your bio creates hesitation, not bookings.",
      "Location matters most for parents specifically looking for in-person sessions — if you offer both virtual and in-person, keeping both session types accurately reflected means you show up in both kinds of searches, not just one.",
      "None of these fields need admin re-review to update — you can adjust your bio, price, or location anytime as your practice changes, without touching your verification status.",
    ],
  },
  {
    slug: "messaging-boundaries-that-work",
    audience: "therapist",
    category: "For therapists",
    title: "Setting messaging boundaries that protect your time",
    readTime: "3 min read",
    excerpt: "Generic, practical advice on response-time expectations that keeps messaging sustainable.",
    body: [
      "Messaging access is one of the things parents value most about working with a therapist directly, but without some structure it can quietly expand to fill every hour you're awake. A few boundaries that tend to hold up over time.",
      "Set an expectation early, not reactively. Mentioning in your first session or first message thread roughly when parents can expect a reply (\"I check messages once a day, usually in the evening\") heads off both anxious follow-ups and the assumption that you're always reachable.",
      "Reserve same-day replies for what's actually urgent. Most parent messages are updates or questions that can wait a day — treating all of them as urgent trains parents to expect that pace permanently, which is hard to walk back later.",
      "It's fine, and often better for the relationship, to redirect a long clinical question to the next session rather than answering it in a rushed message. \"That's worth talking through properly — let's cover it Thursday\" respects the question more than a quick, incomplete answer does.",
      "Consistency matters more than speed. Parents adjust easily to a therapist who reliably replies within a day; what erodes trust is unpredictability — fast replies for weeks, then silence, then fast again.",
    ],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesForAudience(audience: Audience): Article[] {
  return ARTICLES.filter((a) => a.audience === audience);
}
