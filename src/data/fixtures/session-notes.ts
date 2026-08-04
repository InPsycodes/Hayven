import type { SessionNote } from "../types";

export const sessionNotes: SessionNote[] = [
  {
    id: "note_zara_1",
    bookingId: "booking_zara_completed",
    therapistId: "thp_amara",
    summary: "Zara was engaged for the full session and worked on forming 4-5 word sentences using picture prompts.",
    goalsAddressed: ["goal_zara_sentences"],
    recommendations: "Zara is putting full sentences together on her own now, without me prompting each word -- that's a real shift from last month. Keep reinforcing at home with the exercise sheet.",
    visibleToParent: true,
    createdAt: "2026-07-20T11:15:00Z",
  },
  {
    id: "note_dayo_1",
    bookingId: "booking_dayo_completed",
    therapistId: "thp_chinedu",
    summary: "Worked with Dayo on a simple check-in routine for noticing frustration before it builds up.",
    goalsAddressed: ["goal_dayo_focus"],
    recommendations: "Dayo is starting to name when he feels frustrated instead of acting out right away, which is exactly what we're working toward. We'll keep building on that next session.",
    visibleToParent: true,
    createdAt: "2026-07-15T17:00:00Z",
  },
  {
    id: "note_dayo_internal",
    bookingId: "booking_dayo_completed",
    therapistId: "thp_chinedu",
    summary: "Internal clinical observation: possible early signs of mild attention difficulty worth monitoring over the next few sessions before raising with parent.",
    goalsAddressed: [],
    recommendations: "Continue monitoring; revisit in 3 sessions before any formal recommendation.",
    visibleToParent: false,
    createdAt: "2026-07-15T17:05:00Z",
  },
];
