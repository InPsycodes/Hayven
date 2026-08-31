import {
  IconLayoutDashboard,
  IconCalendarCheck,
  IconClipboardText,
  IconFileText,
  IconMessageCircle,
  IconUsers,
  IconHome,
  IconActivity,
} from "@tabler/icons-react";

/**
 * Illustrative-only content for the landing page's dashboard mock. This is
 * marketing collateral, not real data -- it has no connection to the actual
 * parent dashboard at /parent (see src/lib/parent/queries.ts for that).
 * Sidebar labels and sections are kept close to the real app's own nav
 * (see src/components/layout/nav-config.ts) and feature set -- nothing
 * shown here is a feature Hayven doesn't actually have.
 */

export const DASHBOARD_NAV = [
  { label: "Dashboard", icon: IconLayoutDashboard, active: true },
  { label: "Sessions", icon: IconCalendarCheck },
  { label: "Intake form", icon: IconClipboardText },
  { label: "Reports", icon: IconFileText },
];

export const DASHBOARD_CHILDREN = [
  { initials: "BA", name: "Bimpe", active: true },
  { initials: "TA", name: "Tunde" },
];

export const DASHBOARD_CARE_TEAM = {
  initials: "FA",
  name: "Dr. Adebayo",
  role: "Speech therapist",
};

export const DASHBOARD_PREVIEW = {
  url: "hayven.com.ng/parent/children/bimpe",
  childInitials: "BA",
  childName: "Bimpe Adewale",
  meta: "Age 6 · Speech Therapy · 14 sessions · started 12 Mar 2026",
  statusLabel: "On track",
  stats: [
    { label: "Communication", value: 82, delta: "+9", icon: IconMessageCircle, tone: "strong" as const },
    { label: "Social interaction", value: 64, delta: "+4", icon: IconUsers, tone: "default" as const },
    { label: "Daily living skills", value: 71, delta: "+6", icon: IconHome, tone: "default" as const },
    { label: "Attendance", value: 93, delta: "13/14", icon: IconActivity, tone: "strong" as const },
  ],
  goalProgress: {
    months: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    communication: [28, 41, 52, 61, 74, 82],
    social: [15, 22, 31, 38, 52, 64],
  },
  nextAppointment: {
    label: "Therapy review",
    time: "Wed 27 Aug · 10:00 AM",
    location: "Virtual session",
  },
  attendance: {
    weeks: [1, 1, 1, 0, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 1],
    footnote: "1 session missed · rescheduled 4 Jul",
  },
  sessionNotes: [
    { quote: "Bimpe used a 4-word sentence unprompted today. Try the picture cards at home.", author: "Dr. Adebayo", date: "11 Aug" },
    { quote: "Good engagement in group play, still needs prompting to take turns.", author: "Dr. Adebayo", date: "1 Aug" },
  ],
  intakeForms: [
    { label: "Sensory profile", status: "complete" as const },
    { label: "Medical history", status: "complete" as const },
    { label: "Consent & sharing", status: "complete" as const },
    { label: "Home routine survey", status: "due" as const },
  ],
  reports: [
    { label: "August progress report", meta: "9 pages · new", isNew: true },
    { label: "Quarterly review · Q2", meta: "7 pages" },
    { label: "Initial assessment", meta: "6 pages" },
  ],
};

export const DASHBOARD_CHECKLIST = [
  "Upcoming appointments & reminders",
  "Intake form status at a glance",
  "Assigned therapist & session notes",
];

export const DASHBOARD_FEATURE_CARDS = [
  {
    key: "dashboard",
    title: "Dashboard",
    description: "Goal progress, attendance and what's next, all at a glance.",
    icon: IconLayoutDashboard,
  },
  {
    key: "sessions",
    title: "Sessions",
    description: "Every upcoming and past session, with notes from your child's therapist.",
    icon: IconCalendarCheck,
  },
  {
    key: "intake",
    title: "Intake form",
    description: "What's complete and what's still needed before the first session.",
    icon: IconClipboardText,
  },
  {
    key: "reports",
    title: "Reports",
    description: "Progress reports shared by the therapist, ready to read anytime.",
    icon: IconFileText,
  },
] as const;
