import { IconMessageCircle, IconUsers, IconHome } from "@tabler/icons-react";

/**
 * Illustrative-only content for the landing page's dashboard mock. This is
 * marketing collateral, not real data -- it has no connection to the actual
 * parent dashboard at /parent (see src/data/queries.ts for that).
 */
export const DASHBOARD_PREVIEW = {
  childInitials: "BA",
  childName: "Bimpe Adewale",
  meta: "Speech Therapy · Dr. Funmilayo Adebayo",
  statusLabel: "On track",
  progress: [
    { label: "Communication", value: 82, icon: IconMessageCircle },
    { label: "Social interaction", value: 64, icon: IconUsers },
    { label: "Daily living skills", value: 71, icon: IconHome },
  ],
  footerLabel: "Therapy review",
  footerTime: "Wed, 10:00 AM",
};

export const DASHBOARD_CHECKLIST = [
  "Upcoming appointments & reminders",
  "Intake form status at a glance",
  "Assigned therapist & session notes",
];
