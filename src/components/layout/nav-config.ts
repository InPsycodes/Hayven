import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";
import {
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconMessage,
  IconWallet,
  IconBabyCarriage,
  IconSearch,
  IconBook,
  IconCreditCard,
  IconUserCircle,
} from "@tabler/icons-react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
}

type AppRole = "parent" | "therapist";

/** Desktop sidebar nav, per-role. */
export const SIDEBAR_NAV: Record<AppRole, NavItem[]> = {
  parent: [
    { label: "Dashboard", href: "/parent", icon: IconLayoutDashboard },
    { label: "My children", href: "/parent/children", icon: IconBabyCarriage },
    { label: "Find a therapist", href: "/search", icon: IconSearch },
    { label: "Messages", href: "/parent/messages", icon: IconMessage },
    { label: "Learning Center", href: "/learn", icon: IconBook },
    { label: "Billing", href: "/parent/billing", icon: IconCreditCard },
  ],
  therapist: [
    { label: "Dashboard", href: "/therapist", icon: IconLayoutDashboard },
    { label: "Schedule", href: "/therapist/schedule", icon: IconCalendar },
    { label: "Caseload", href: "/therapist/caseload", icon: IconUsers },
    { label: "Messages", href: "/therapist/messages", icon: IconMessage },
    { label: "Earnings", href: "/therapist/earnings", icon: IconWallet },
  ],
};

/** Mobile bottom-tab nav, per-role -- deliberately a shorter subset of SIDEBAR_NAV. */
export const BOTTOM_TABS: Record<AppRole, NavItem[]> = {
  parent: [
    { label: "Home", href: "/parent", icon: IconLayoutDashboard },
    { label: "Sessions", href: "/parent/sessions", icon: IconCalendar },
    { label: "Messages", href: "/parent/messages", icon: IconMessage },
    { label: "Learn", href: "/learn", icon: IconBook },
    { label: "Profile", href: "/parent/profile", icon: IconUserCircle },
  ],
  therapist: [
    { label: "Home", href: "/therapist", icon: IconLayoutDashboard },
    { label: "Schedule", href: "/therapist/schedule", icon: IconCalendar },
    { label: "Caseload", href: "/therapist/caseload", icon: IconUsers },
    { label: "Messages", href: "/therapist/messages", icon: IconMessage },
    { label: "Profile", href: "/therapist/profile", icon: IconUserCircle },
  ],
};
