/**
 * Help & FAQs content. Static editorial copy, not part of the backend data
 * model -- same convention as src/content/marketing/trust.ts. `role` omitted
 * means the entry shows to both parents and therapists.
 */
export interface FaqEntry {
  question: string;
  answer: string;
  role?: "parent" | "therapist";
}

export interface FaqCategory {
  title: string;
  entries: FaqEntry[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Booking & sessions",
    entries: [
      {
        question: "How do I book a session?",
        answer:
          "Search for a therapist, pick an available time slot, and pay to confirm. You'll get a confirmation once payment goes through.",
      },
      {
        question: "Virtual or in-person — how do I choose?",
        answer:
          "Each therapist lists which formats they offer; you pick when you book. Virtual sessions get a meeting link once confirmed.",
      },
      {
        question: "Can I cancel a session?",
        answer:
          "Yes, from Sessions, up until the session's start time. Cancelling a session you've already paid for doesn't refund automatically — Hayven's team follows up separately to process it.",
        role: "parent",
      },
      {
        question: "Can I cancel a session I can't make?",
        answer:
          "Yes, from Schedule, up until the session's start time. The parent is notified and the slot is freed either way.",
        role: "therapist",
      },
    ],
  },
  {
    title: "Payments & refunds",
    entries: [
      {
        question: "How do I pay?",
        answer: "Through Paystack at checkout, in Naira.",
      },
      {
        question: "What happens to my money if a paid session is cancelled?",
        answer:
          "It isn't refunded automatically. Hayven's team processes it manually and it'll show as \"Refunded\" in your Billing history once done.",
      },
      {
        question: "Where can I see my payment history?",
        answer: "Billing (parents) or Earnings (therapists), both linked from the sidebar.",
      },
    ],
  },
  {
    title: "Verification",
    entries: [
      {
        question: "How are therapists verified?",
        answer:
          "Every therapist submits their credentials for review before their profile goes live. Verified profiles show a badge naming their professional body.",
        role: "parent",
      },
      {
        question: "Why isn't my profile visible to parents yet?",
        answer:
          "New profiles stay hidden until Hayven reviews and approves your submitted credentials. You'll get a notification the moment a decision is made.",
        role: "therapist",
      },
    ],
  },
  {
    title: "Messaging & progress",
    entries: [
      {
        question: "How do I message my therapist / the parent?",
        answer: "Open any booking from Sessions (parent) or Schedule (therapist) and use Messages.",
      },
      {
        question: "How do I know when there's a session note or new message?",
        answer:
          "The bell icon in the header shows real-time updates for new messages, session notes, booking confirmations, and payment/verification events.",
      },
    ],
  },
  {
    title: "Account & privacy",
    entries: [
      {
        question: "Who can see my child's information?",
        answer: "Only you, your child's treating therapist, and Hayven admins. No one else has access.",
        role: "parent",
      },
      {
        question: "How do I update my account details?",
        answer:
          "From Profile, for both account info and (therapists) professional details like bio, price, and location.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Request it from Profile. It isn't instant — Hayven's team reviews every request and follows up by email before anything is deleted, since records tied to your account may still be in active use.",
      },
    ],
  },
];
