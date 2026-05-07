import { NAV_ITEMS, WORKSPACE_APP_MODULES } from "@/config/navigation";
import type { AppModule, UserRole } from "@/types/auth.types";

export const VIEW_CONFIG = [
  { id: "management", label: "User Management" },
  { id: "staff", label: "Staff Accounts" },
  { id: "access", label: "Access Review" },
] as const;

export type ViewId = (typeof VIEW_CONFIG)[number]["id"];

export const SUB_NAV = VIEW_CONFIG.map((v) => ({ label: v.label, view: v.id, href: `/users?view=${v.id}` }));

export const ROLE_OPTIONS: UserRole[] = [
  "RECORDS_OFFICER",
  "NURSE",
  "MEDICAL_OFFICER",
  "MIDWIFE",
  "LAB_SCIENTIST",
  "LAB_TECH",
  "PHARMACIST",
  "PHARMACY_TECH",
  "RADIOGRAPHER",
  "FINANCE_OFFICER",
  "BILLING_OFFICER",
  "HIO",
  "FACILITY_ADMIN",
  "SUPER_ADMIN",
];

export const MODULE_OPTIONS = NAV_ITEMS.map((item) => ({ module: item.module, label: item.label }));

export function defaultModulesForRole(role: UserRole): AppModule[] {
  const map: Record<UserRole, AppModule[]> = {
    RECORDS_OFFICER: ["records", "appointments", "opd"],
    NURSE: ["nurse", "wards"],
    MEDICAL_OFFICER: [
      "nurse",
      "wards",
      "opd",
      "laboratory",
      "radiology",
      "pharmacy",
      "anc",
    ],
    MIDWIFE: ["anc"],
    LAB_SCIENTIST: ["laboratory"],
    LAB_TECH: ["laboratory"],
    PHARMACIST: ["pharmacy"],
    PHARMACY_TECH: ["pharmacy"],
    RADIOGRAPHER: ["radiology"],
    FINANCE_OFFICER: ["finance"],
    BILLING_OFFICER: ["billing"],
    HIO: ["reports", "dashboard"],
    FACILITY_ADMIN: [...WORKSPACE_APP_MODULES],
    SUPER_ADMIN: [...WORKSPACE_APP_MODULES],
  };
  return map[role];
}

export function isViewId(value: string | null): value is ViewId {
  return value === "management" || value === "staff" || value === "access";
}
