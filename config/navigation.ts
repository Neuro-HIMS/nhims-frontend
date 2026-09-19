import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  BedDouble,
  Baby,
  FlaskConical,
  Pill,
  Scan,
  CreditCard,
  BarChart3,
  CalendarDays,
  Users,
  Building2,
  ScrollText,
  AlertTriangle,
  UsersRound,
  Syringe,
  Smile,
  Brain,
  Activity,
  Droplets,
  Landmark,
  type LucideIcon,
} from "lucide-react";

import type { AppModule, UserRole } from "@/types/auth.types";

/** The seven work-type groups shown in the left-hand menu (design brief §5). */
export type NavGroup =
  | "home"
  | "patients"
  | "care"
  | "tests-and-medicines"
  | "money"
  | "reports"
  | "admin";

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  home: "Home",
  patients: "Patients",
  care: "Care",
  "tests-and-medicines": "Tests and medicines",
  money: "Money",
  reports: "Reports",
  admin: "Admin",
};

/** Order groups appear in the sidebar, top to bottom. */
export const NAV_GROUP_ORDER: NavGroup[] = [
  "home",
  "patients",
  "care",
  "tests-and-medicines",
  "money",
  "reports",
  "admin",
];

export interface NavItem {
  href: string;
  /** Plain-language label shown in the menu — no jargon (design brief §2). */
  label: string;
  icon: LucideIcon;
  module: AppModule;
  group: NavGroup;
  allowedRoles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    module: "dashboard",
    group: "home",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN", "HIO"],
  },
  {
    href: "/records",
    label: "Find a patient",
    icon: UserPlus,
    module: "records",
    group: "patients",
    allowedRoles: ["RECORDS_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/appointments",
    label: "Appointments",
    icon: CalendarDays,
    module: "appointments",
    group: "patients",
    allowedRoles: ["RECORDS_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/emergency",
    label: "Emergency",
    icon: AlertTriangle,
    module: "emergency",
    group: "care",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/opd",
    label: "Outpatient clinic (OPD)",
    icon: UsersRound,
    module: "opd",
    group: "care",
    allowedRoles: ["RECORDS_OFFICER", "NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/nurse",
    label: "Nurse station",
    icon: ClipboardList,
    module: "nurse",
    group: "care",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/wards",
    label: "Wards",
    icon: BedDouble,
    module: "wards",
    group: "care",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/anc",
    label: "Antenatal care (ANC)",
    icon: Baby,
    module: "anc",
    group: "care",
    allowedRoles: ["MIDWIFE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/surgery",
    label: "Theatre and surgery",
    icon: Syringe,
    module: "surgery",
    group: "care",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/dental",
    label: "Dental",
    icon: Smile,
    module: "dental",
    group: "care",
    allowedRoles: ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/mental-health",
    label: "Mental health",
    icon: Brain,
    module: "mental-health",
    group: "care",
    allowedRoles: ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/physiotherapy",
    label: "Physiotherapy",
    icon: Activity,
    module: "physiotherapy",
    group: "care",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    module: "laboratory",
    group: "tests-and-medicines",
    allowedRoles: ["LAB_SCIENTIST", "LAB_TECH", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/radiology",
    label: "Imaging (Radiology)",
    icon: Scan,
    module: "radiology",
    group: "tests-and-medicines",
    allowedRoles: ["RADIOGRAPHER", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/pharmacy",
    label: "Pharmacy",
    icon: Pill,
    module: "pharmacy",
    group: "tests-and-medicines",
    allowedRoles: ["PHARMACIST", "PHARMACY_TECH", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/blood-bank",
    label: "Blood bank",
    icon: Droplets,
    module: "blood-bank",
    group: "tests-and-medicines",
    allowedRoles: ["LAB_SCIENTIST", "LAB_TECH", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/finance",
    label: "Prices and revenue",
    icon: Landmark,
    module: "finance",
    group: "money",
    allowedRoles: ["FINANCE_OFFICER", "BILLING_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/billing",
    label: "Bills and payments",
    icon: CreditCard,
    module: "billing",
    group: "money",
    allowedRoles: ["BILLING_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    module: "reports",
    group: "reports",
    allowedRoles: [
      "HIO",
      "FACILITY_ADMIN",
      "SUPER_ADMIN",
      "MEDICAL_OFFICER",
      "FINANCE_OFFICER",
      "RECORDS_OFFICER",
      "BILLING_OFFICER",
    ],
  },
  {
    href: "/users",
    label: "Staff and access",
    icon: Users,
    module: "users",
    group: "admin",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/facility",
    label: "Facility settings",
    icon: Building2,
    module: "facility",
    group: "admin",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/audit-log",
    label: "Activity history",
    icon: ScrollText,
    module: "audit-log",
    group: "admin",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN"],
  },
];

/** Ordered keys as shown in the primary nav — use for admin default module assignments. */
export const WORKSPACE_APP_MODULES: AppModule[] = NAV_ITEMS.map((item) => item.module);
