import { IconArrowUpRight, IconUsers, IconFileText } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * Illustrative-only content for the homepage "Progress & Support" section
 * (src/components/marketing/dashboard-preview.tsx). Marketing collateral, not
 * a live screenshot -- no connection to the real parent dashboard at /parent
 * (see src/lib/parent/queries.ts). "Bimpe" and the figures are a sample.
 */

export const DASHBOARD_NAV = [
  "Home",
  "Progress",
  "Sessions",
  "Reports",
  "Messages",
  "Settings",
] as const;

export const PROGRESS_PREVIEW = {
  child: { name: "Bimpe", meta: "5 years · Autism", status: "On track" },
  communication: {
    value: 82,
    lastMonth: 76,
    note: "Bimpe is using longer phrases more consistently during sessions.",
    highlight: "This shows great progress in expressive language!",
  },
  social: {
    value: 64,
    lastMonth: 58,
    note: "Showing more interest in peer interactions.",
  },
  trend: {
    months: ["Apr", "May", "Jun", "Jul", "Aug"],
    communication: [68, 72, 76, 79, 82],
    social: [50, 54, 58, 61, 64],
  },
  goal: { done: 8, total: 10 },
  attendance: 94,
  nextSession: {
    label: "Therapy review",
    time: "Wed, 27 Aug · 10:00 AM",
    mode: "Virtual session",
    therapist: "Dr. Adaeze Okwu",
    therapistRole: "Speech & Language Therapist",
  },
  note: {
    quote: "Bimpe used a 4-word sentence unprompted today. Try the picture cards at home.",
    author: "Dr. Adebayo",
    date: "11 Aug",
  },
  report: { label: "August progress report", meta: "9 pages · PDF" },
};

export interface SupportPoint {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
}

export const SUPPORT_POINTS: SupportPoint[] = [
  {
    icon: IconArrowUpRight,
    title: "See progress",
    body: "Understand how your child is progressing without decoding clinical charts.",
  },
  {
    icon: IconUsers,
    title: "Stay connected",
    body: "Keep up with sessions, therapist notes and what's happening next.",
  },
  {
    icon: IconFileText,
    title: "Keep everything together",
    body: "Reports, appointments and care information live in one place.",
  },
];
