export interface MarketingFaqEntry {
  question: string;
  answer: string;
}

export const MARKETING_FAQS: MarketingFaqEntry[] = [
  {
    question: "How are therapists vetted?",
    answer:
      "Every therapist submits their professional credentials for review before their profile ever goes live. You'll only ever see verified profiles when you search or get matched.",
  },
  {
    question: "What kinds of therapy does Hayven cover?",
    answer:
      "Speech therapy, occupational therapy, ABA therapy, and developmental psychology, with therapists across all four listed on the platform today.",
  },
  {
    question: "How much does a session cost?",
    answer:
      "Each therapist sets their own session price, so it varies by specialist. You can filter by your budget when you search or take the matching quiz.",
  },
  {
    question: "Virtual or in-person: how do I choose?",
    answer:
      "Each therapist lists which formats they offer, and you pick when you book. Virtual sessions hand off to a video link once your booking is confirmed.",
  },
  {
    question: "What if I need to cancel a session?",
    answer:
      "You can cancel any upcoming session from your dashboard, right up until it starts. If you'd already paid, that isn't refunded automatically. Hayven's team follows up separately to process it.",
  },
  {
    question: "Is my child's information private?",
    answer:
      "Only you, your child's treating therapist, and Hayven admins can see it. It's never shared beyond the people directly involved in your child's care.",
  },
  {
    question: "Do I have to take the matching quiz?",
    answer:
      "No, it's a two-minute shortcut to a shortlist based on your child's needs, budget, and format preference. You're always free to browse and search on your own instead.",
  },
];
