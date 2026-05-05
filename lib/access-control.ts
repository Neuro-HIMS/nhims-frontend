import { FACILITY_SERVICE_TO_APP_MODULE } from "@/config/facility-service-modules";
import type { AppModule, AuthUser, UserRole } from "@/types/auth.types";

/** App modules that map to a canonical facility service line — subject to Facility Settings toggles. */
export const FACILITY_GATED_APP_MODULES: ReadonlySet<AppModule> = new Set(Object.values(FACILITY_SERVICE_TO_APP_MODULE));

export const MODULE_PATHS: Record<AppModule, string> = {
  dashboard: "/dashboard",
  records: "/records",
  appointments: "/appointments",
  emergency: "/emergency",
  opd: "/opd",
  nurse: "/nurse",
  wards: "/wards",
  anc: "/anc",
  surgery: "/surgery",
  dental: "/dental",
  "mental-health": "/mental-health",
  laboratory: "/laboratory",
  pharmacy: "/pharmacy",
  radiology: "/radiology",
  physiotherapy: "/physiotherapy",
  "blood-bank": "/blood-bank",
  billing: "/billing",
  reports: "/reports",
  users: "/users",
  facility: "/facility",
  "audit-log": "/audit-log",
};

const DEFAULT_MODULE_BY_ROLE: Record<UserRole, AppModule> = {
  RECORDS_OFFICER: "records",
  NURSE: "nurse",
  MEDICAL_OFFICER: "nurse",
  MIDWIFE: "anc",
  LAB_SCIENTIST: "laboratory",
  LAB_TECH: "laboratory",
  PHARMACIST: "pharmacy",
  PHARMACY_TECH: "pharmacy",
  RADIOGRAPHER: "radiology",
  BILLING_OFFICER: "billing",
  HIO: "reports",
  FACILITY_ADMIN: "dashboard",
  SUPER_ADMIN: "dashboard",
};

const ROLE_ACCESS_BY_MODULE: Record<AppModule, UserRole[]> = {
  dashboard: ["FACILITY_ADMIN", "SUPER_ADMIN", "HIO"],
  records: ["RECORDS_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  appointments: ["RECORDS_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  emergency: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  opd: ["RECORDS_OFFICER", "NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  nurse: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  wards: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  anc: ["MIDWIFE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  surgery: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  dental: ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  "mental-health": ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  laboratory: ["LAB_SCIENTIST", "LAB_TECH", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  pharmacy: ["PHARMACIST", "PHARMACY_TECH", "FACILITY_ADMIN", "SUPER_ADMIN"],
  radiology: ["RADIOGRAPHER", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  physiotherapy: ["NURSE", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  "blood-bank": ["LAB_SCIENTIST", "LAB_TECH", "MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  billing: ["BILLING_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"],
  reports: ["HIO", "FACILITY_ADMIN", "SUPER_ADMIN"],
  users: ["FACILITY_ADMIN", "SUPER_ADMIN"],
  facility: ["FACILITY_ADMIN", "SUPER_ADMIN"],
  "audit-log": ["FACILITY_ADMIN", "SUPER_ADMIN"],
};

export function getLandingPathForUser(user: AuthUser): string {
  if (user.assignedModules.length > 0) {
    return MODULE_PATHS[user.assignedModules[0]];
  }

  return MODULE_PATHS[DEFAULT_MODULE_BY_ROLE[user.role]];
}

export function canUserAccessModule(user: AuthUser, module: AppModule): boolean {
  if (user.assignedModules.length > 0) {
    return user.assignedModules.includes(module);
  }

  return ROLE_ACCESS_BY_MODULE[module].includes(user.role);
}

/** False only when the facility disabled the matching service line (dashboard / admin modules are never gated here). */
export function isModuleEnabledAtFacility(user: AuthUser, module: AppModule): boolean {
  if (!FACILITY_GATED_APP_MODULES.has(module)) return true;
  const enabled = user.enabledHmisModuleKeys;
  if (enabled === undefined) return true;
  return enabled.includes(module);
}

/** Role/module permission plus facility service availability — use for nav and route guards. */
export function canAccessWorkspaceModule(user: AuthUser, module: AppModule): boolean {
  return canUserAccessModule(user, module) && isModuleEnabledAtFacility(user, module);
}

export function getModuleFromPath(pathname: string): AppModule | null {
  const clean = pathname.split("?")[0].split("#")[0];
  const sorted = Object.entries(MODULE_PATHS).sort((a, b) => b[1].length - a[1].length);
  const entry = sorted.find(([, path]) => clean === path || clean.startsWith(`${path}/`));
  return (entry?.[0] as AppModule | undefined) ?? null;
}
