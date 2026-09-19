import { NAV_ITEMS } from "@/config/navigation";
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
  finance: "/finance",
  billing: "/billing",
  reports: "/reports",
  users: "/users",
  facility: "/facility",
  "audit-log": "/audit-log",
};

const DEFAULT_MODULE_BY_ROLE: Record<UserRole, AppModule> = {
  RECORDS_OFFICER: "records",
  NURSE: "nurse",
  MEDICAL_OFFICER: "opd",
  MIDWIFE: "anc",
  LAB_SCIENTIST: "laboratory",
  LAB_TECH: "laboratory",
  PHARMACIST: "pharmacy",
  PHARMACY_TECH: "pharmacy",
  RADIOGRAPHER: "radiology",
  FINANCE_OFFICER: "finance",
  BILLING_OFFICER: "billing",
  HIO: "reports",
  FACILITY_ADMIN: "dashboard",
  SUPER_ADMIN: "dashboard",
};

/** Role lists per module — sourced from primary nav so headers and Role Assignment stay aligned. */
const ROLE_ACCESS_BY_MODULE: Record<AppModule, UserRole[]> = NAV_ITEMS.reduce(
  (acc, item) => {
    acc[item.module] = item.allowedRoles;
    return acc;
  },
  {} as Record<AppModule, UserRole[]>,
);

export function getLandingPathForUser(user: AuthUser): string {
  const firstAssigned = user.assignedModules.find((m) => MODULE_PATHS[m] !== undefined);
  if (firstAssigned) {
    return MODULE_PATHS[firstAssigned];
  }

  return MODULE_PATHS[DEFAULT_MODULE_BY_ROLE[user.role]] ?? "/dashboard";
}

export function canUserAccessModule(user: AuthUser, module: AppModule): boolean {
  if (user.assignedModules.length > 0) {
    return user.assignedModules.includes(module);
  }

  return ROLE_ACCESS_BY_MODULE[module]?.includes(user.role) ?? false;
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
