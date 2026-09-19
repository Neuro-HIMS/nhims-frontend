import { NAV_ITEMS, WORKSPACE_APP_MODULES } from "@/config/navigation";
import type { AppModule, UserRole } from "@/types/auth.types";

/** Matches backend {@code PLACEHOLDER_CLINICAL_MODULES} — not assignable until product ships real workflows. */
export const PLACEHOLDER_CLINICAL_MODULES: ReadonlySet<AppModule> = new Set([
  "surgery",
  "dental",
  "mental-health",
  "physiotherapy",
  "blood-bank",
  "emergency",
]);

/** Real, always-visible tabs. "new" (add staff) is reached via the primary button, not a tab. */
export const VIEW_CONFIG = [
  { id: "staff", label: "Staff" },
  { id: "access", label: "Check who can open what" },
] as const;

export type TabViewId = (typeof VIEW_CONFIG)[number]["id"];
export type ViewId = TabViewId | "new";

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
  const strip = (mods: AppModule[]) => mods.filter((m) => !PLACEHOLDER_CLINICAL_MODULES.has(m));
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
    FACILITY_ADMIN: strip([...WORKSPACE_APP_MODULES]),
    SUPER_ADMIN: strip([...WORKSPACE_APP_MODULES]),
  };
  return map[role];
}

export function isViewId(value: string | null): value is ViewId {
  return value === "staff" || value === "access" || value === "new";
}
