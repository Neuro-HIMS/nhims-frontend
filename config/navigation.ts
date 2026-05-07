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

export interface ModuleSubNavItem {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module: AppModule;
  workflowGroup: "overview" | "clinical" | "diagnostics" | "finance" | "admin";
  allowedRoles: UserRole[];
  subNav: ModuleSubNavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    workflowGroup: "overview",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN", "HIO"],
    subNav: [
      { label: "Overview", href: "/dashboard?view=overview" },
      { label: "Indicators", href: "/dashboard?view=indicators" },
      { label: "Alerts", href: "/dashboard?view=alerts" },
    ],
  },
  {
    href: "/records",
    label: "Records",
    icon: UserPlus,
    module: "records",
    workflowGroup: "clinical",
    allowedRoles: ["RECORDS_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Register Patient", href: "/records?view=register" },
      { label: "Search Records", href: "/records?view=search" },
      { label: "Patient Records", href: "/records?view=manage" },
      { label: "Visit History", href: "/records?view=visits" },
    ],
  },
  {
    href: "/appointments",
    label: "Appointments",
    icon: CalendarDays,
    module: "appointments",
    workflowGroup: "clinical",
    allowedRoles: ["RECORDS_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Book", href: "/appointments?view=book" },
      { label: "Calendar", href: "/appointments?view=calendar" },
      { label: "Today's Queue", href: "/appointments?view=queue" },
      { label: "Appointment History", href: "/appointments?view=history" },
    ],
  },
  {
    href: "/emergency",
    label: "Emergency",
    icon: AlertTriangle,
    module: "emergency",
    workflowGroup: "clinical",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Board", href: "/emergency?view=board" },
      { label: "Triage", href: "/emergency?view=triage" },
      { label: "Handoff", href: "/emergency?view=handoff" },
    ],
  },
  {
    href: "/opd",
    label: "OPD",
    icon: UsersRound,
    module: "opd",
    workflowGroup: "clinical",
    allowedRoles: ["RECORDS_OFFICER", "NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Consult Queue", href: "/opd?view=queue" },
      { label: "Consultations", href: "/opd?view=consult" },
      { label: "Follow-up", href: "/opd?view=followup" },
    ],
  },
  {
    href: "/nurse",
    label: "Nurse Station",
    icon: ClipboardList,
    module: "nurse",
    workflowGroup: "clinical",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Triage", href: "/nurse?view=triage" },
      { label: "Vitals", href: "/nurse?view=vitals" },
      { label: "Queue", href: "/nurse?view=queue" },
    ],
  },
  {
    href: "/wards",
    label: "Ward Management",
    icon: BedDouble,
    module: "wards",
    workflowGroup: "clinical",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Admissions", href: "/wards?view=admissions" },
      { label: "Bed Board", href: "/wards?view=beds" },
      { label: "Discharge", href: "/wards?view=discharge" },
    ],
  },
  {
    href: "/anc",
    label: "Antenatal Care",
    icon: Baby,
    module: "anc",
    workflowGroup: "clinical",
    allowedRoles: ["MIDWIFE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "ANC Clients", href: "/anc?view=clients" },
      { label: "Follow-up Visits", href: "/anc?view=visits" },
      { label: "Risk Tracking", href: "/anc?view=risk" },
    ],
  },
  {
    href: "/surgery",
    label: "Theatre & Surgery",
    icon: Syringe,
    module: "surgery",
    workflowGroup: "clinical",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Schedule", href: "/surgery?view=schedule" },
      { label: "Theatre Board", href: "/surgery?view=board" },
      { label: "Recovery", href: "/surgery?view=recovery" },
    ],
  },
  {
    href: "/dental",
    label: "Dental",
    icon: Smile,
    module: "dental",
    workflowGroup: "clinical",
    allowedRoles: ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Clinic Queue", href: "/dental?view=queue" },
      { label: "Charts", href: "/dental?view=charts" },
      { label: "Procedures", href: "/dental?view=procedures" },
    ],
  },
  {
    href: "/mental-health",
    label: "Mental Health",
    icon: Brain,
    module: "mental-health",
    workflowGroup: "clinical",
    allowedRoles: ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "OP Clinic", href: "/mental-health?view=clinic" },
      { label: "Reviews", href: "/mental-health?view=reviews" },
      { label: "Care Plans", href: "/mental-health?view=plans" },
    ],
  },
  {
    href: "/laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    module: "laboratory",
    workflowGroup: "diagnostics",
    allowedRoles: ["LAB_SCIENTIST", "LAB_TECH", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Worklist", href: "/laboratory?view=worklist" },
      { label: "Patient search", href: "/laboratory?view=search" },
      { label: "Result entry", href: "/laboratory?view=results" },
      { label: "Catalog & setup", href: "/laboratory?view=catalog" },
      { label: "Quality Control", href: "/laboratory?view=quality" },
    ],
  },
  {
    href: "/radiology",
    label: "Radiology",
    icon: Scan,
    module: "radiology",
    workflowGroup: "diagnostics",
    allowedRoles: ["RADIOGRAPHER", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Worklist", href: "/radiology?view=worklist" },
      { label: "Requests", href: "/radiology?view=requests" },
      { label: "Reports", href: "/radiology?view=reports" },
    ],
  },
  {
    href: "/pharmacy",
    label: "Pharmacy",
    icon: Pill,
    module: "pharmacy",
    workflowGroup: "diagnostics",
    allowedRoles: ["PHARMACIST", "PHARMACY_TECH", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Dispensing Queue", href: "/pharmacy?view=queue" },
      { label: "Dispense", href: "/pharmacy?view=dispense" },
      { label: "Inventory", href: "/pharmacy?view=inventory" },
    ],
  },
  {
    href: "/physiotherapy",
    label: "Physiotherapy",
    icon: Activity,
    module: "physiotherapy",
    workflowGroup: "clinical",
    allowedRoles: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Referrals", href: "/physiotherapy?view=referrals" },
      { label: "Sessions", href: "/physiotherapy?view=sessions" },
      { label: "Goals", href: "/physiotherapy?view=goals" },
    ],
  },
  {
    href: "/blood-bank",
    label: "Blood Bank",
    icon: Droplets,
    module: "blood-bank",
    workflowGroup: "diagnostics",
    allowedRoles: ["LAB_SCIENTIST", "LAB_TECH", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Inventory", href: "/blood-bank?view=inventory" },
      { label: "Cross-match", href: "/blood-bank?view=crossmatch" },
      { label: "Issues", href: "/blood-bank?view=issues" },
    ],
  },
  {
    href: "/finance",
    label: "Finance",
    icon: Landmark,
    module: "finance",
    workflowGroup: "finance",
    allowedRoles: ["FINANCE_OFFICER", "BILLING_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Dashboard", href: "/finance?view=dashboard" },
      { label: "Services", href: "/finance?view=catalog" },
      { label: "Pricing matrix", href: "/finance?view=pricing-matrix" },
      { label: "Billing", href: "/finance?view=billing" },
      { label: "Payments", href: "/finance?view=payments" },
      { label: "Revenue", href: "/finance?view=revenue" },
      { label: "Legacy prices", href: "/finance?view=legacy-pricing" },
      { label: "NHIS Claims", href: "/finance?view=nhis-claims" },
      { label: "NHIS Reports", href: "/finance?view=nhis-reports" },
    ],
  },
  {
    href: "/billing",
    label: "Billing",
    icon: CreditCard,
    module: "billing",
    workflowGroup: "finance",
    allowedRoles: ["BILLING_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Dashboard", href: "/billing?view=dashboard" },
      { label: "Bills", href: "/billing?view=bills" },
      { label: "New Bill", href: "/billing?view=new" },
      { label: "Payments", href: "/billing?view=payments" },
    ],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    module: "reports",
    workflowGroup: "finance",
    allowedRoles: [
      "HIO",
      "FACILITY_ADMIN",
      "SUPER_ADMIN",
      "MEDICAL_OFFICER",
      "FINANCE_OFFICER",
      "RECORDS_OFFICER",
      "BILLING_OFFICER",
    ],
    subNav: [
      { label: "DHIMS2", href: "/reports?view=dhims2" },
      { label: "Facility monthly", href: "/reports?view=monthly" },
      { label: "Exports hub", href: "/reports?view=exports" },
    ],
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
    module: "users",
    workflowGroup: "admin",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Staff Accounts", href: "/users?view=staff" },
      { label: "Role Assignment", href: "/users?view=roles" },
      { label: "Access Review", href: "/users?view=access" },
    ],
  },
  {
    href: "/facility",
    label: "Facility Settings",
    icon: Building2,
    module: "facility",
    workflowGroup: "admin",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "Profile", href: "/facility?view=profile" },
      { label: "Services", href: "/facility?view=services" },
      { label: "Configuration", href: "/facility?view=config" },
      { label: "Diagnosis classifications", href: "/facility?view=conditions" },
    ],
  },
  {
    href: "/audit-log",
    label: "Audit Log",
    icon: ScrollText,
    module: "audit-log",
    workflowGroup: "admin",
    allowedRoles: ["FACILITY_ADMIN", "SUPER_ADMIN"],
    subNav: [
      { label: "User Events", href: "/audit-log?view=users" },
      { label: "Security Events", href: "/audit-log?view=security" },
      { label: "System Events", href: "/audit-log?view=system" },
    ],
  },
];

/** Ordered keys as shown in the primary nav — use for admin default module assignments. */
export const WORKSPACE_APP_MODULES: AppModule[] = NAV_ITEMS.map((item) => item.module);
