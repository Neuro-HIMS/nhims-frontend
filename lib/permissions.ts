import { canAccessWorkspaceModule, isModuleEnabledAtFacility } from "@/lib/access-control";
import type { AppModule, AuthUser, UserRole } from "@/types/auth.types";

export function hasAccess(
  user: AuthUser,
  allowedRoles: UserRole[],
  module: AppModule
): boolean {
  if (user.assignedModules.length > 0) {
    return canAccessWorkspaceModule(user, module);
  }

  return allowedRoles.includes(user.role) && isModuleEnabledAtFacility(user, module);
}

export function isAdmin(role: UserRole): boolean {
  return role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}

export function isClinical(role: UserRole): boolean {
  return [
    "MEDICAL_OFFICER",
    "NURSE",
    "MIDWIFE",
    "LAB_SCIENTIST",
    "LAB_TECH",
    "PHARMACIST",
    "PHARMACY_TECH",
    "RADIOGRAPHER",
  ].includes(role);
}

// Roles permitted to view a patient's full clinical folder (history, vitals,
// consultations, medications, admissions, referrals, alerts, billing). Other
// clinical roles only see task tickets scoped to the work they have to do.
const FULL_FOLDER_ROLES: UserRole[] = [
  "NURSE",
  "MEDICAL_OFFICER",
  "MIDWIFE",
  "FACILITY_ADMIN",
  "SUPER_ADMIN",
];

export function canViewFullFolder(role: UserRole | undefined): boolean {
  if (!role) return false;
  return FULL_FOLDER_ROLES.includes(role);
}

// Roles permitted to author orders (lab, radiology, prescriptions) on a folder.
const PRESCRIBER_ROLES: UserRole[] = [
  "MEDICAL_OFFICER",
  "MIDWIFE",
  "FACILITY_ADMIN",
  "SUPER_ADMIN",
];

export function canPlaceOrders(role: UserRole | undefined): boolean {
  if (!role) return false;
  return PRESCRIBER_ROLES.includes(role);
}

// Records officer never opens a clinical folder; nurse/MD do. Records-only
// access is read-only demographics on the visit.
export function canRecordVitals(role: UserRole | undefined): boolean {
  if (!role) return false;
  return role === "NURSE" || role === "MIDWIFE" || role === "MEDICAL_OFFICER" || role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}
