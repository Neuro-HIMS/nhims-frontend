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

/** LAB-05: only lab scientists (and admins) authorise results; technicians enter them. */
export function canAuthoriseLabResults(role: UserRole | undefined): boolean {
  return role === "LAB_SCIENTIST" || role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}

/** LAB-08: the lab's test list and ranges — lab scientists and admins. */
export function canManageLabTests(role: UserRole | undefined): boolean {
  return canAuthoriseLabResults(role);
}

/** RAD-02/03: start scans, write and cancel reports — radiographers and admins (07 §86). */
export function canReportImaging(role: UserRole | undefined): boolean {
  return role === "RADIOGRAPHER" || role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}

/** Backend INV_ROLES — who may read pharmacy stock (doctors can't yet — backend-gaps.md#DOC-07-stock). */
/** Medical alerts (allergies etc.) — backend MedicalAlertController READ_ROLES. */
export function canReadAlerts(role: UserRole | undefined): boolean {
  return (
    role === "NURSE" ||
    role === "MIDWIFE" ||
    role === "MEDICAL_OFFICER" ||
    role === "PHARMACIST" ||
    role === "PHARMACY_TECH" ||
    role === "LAB_SCIENTIST" ||
    role === "LAB_TECH" ||
    role === "FACILITY_ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "HIO"
  );
}

/** DOC-14: the treatment sheet (backend TreatmentController WRITE_ROLES). */
export function canWriteTreatments(role: UserRole | undefined): boolean {
  return role === "NURSE" || role === "MIDWIFE" || role === "MEDICAL_OFFICER" || role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}

export function canReadStock(role: UserRole | undefined): boolean {
  return role === "PHARMACIST" || role === "PHARMACY_TECH" || role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}

/** PHA-02/03: check and dispense prescriptions (backend PHARMACY_ROLES, minus doctors — dispensing is pharmacy work). */
export function canDispense(role: UserRole | undefined): boolean {
  return canReadStock(role);
}

/** Lab bench work: take samples and enter results. */
export function canWorkInLab(role: UserRole | undefined): boolean {
  return role === "LAB_TECH" || canAuthoriseLabResults(role);
}

/** Backend PatientController LOOKUP_ROLES — who may read a patient record (radiographers, finance and HIO can't). */
export function canReadPatients(role: UserRole | undefined): boolean {
  return (
    role === "RECORDS_OFFICER" ||
    role === "NURSE" ||
    role === "MEDICAL_OFFICER" ||
    role === "MIDWIFE" ||
    role === "LAB_SCIENTIST" ||
    role === "LAB_TECH" ||
    role === "PHARMACIST" ||
    role === "PHARMACY_TECH" ||
    role === "BILLING_OFFICER" ||
    role === "FACILITY_ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

/** Backend TRANSITION_ROLES — who may move a visit between stages (lab/imaging/pharmacy staff can't). */
export function canMoveVisits(role: UserRole | undefined): boolean {
  return (
    role === "NURSE" ||
    role === "MIDWIFE" ||
    role === "MEDICAL_OFFICER" ||
    role === "RECORDS_OFFICER" ||
    role === "HIO" ||
    role === "FACILITY_ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

/** Backend INBOX_ROLES for critical lab alerts (lab staff can't read the inbox yet — backend-gaps.md#LAB-04-inbox-roles). */
export function canSeeCriticalInbox(role: UserRole | undefined): boolean {
  return (
    role === "MEDICAL_OFFICER" ||
    role === "MIDWIFE" ||
    role === "NURSE" ||
    role === "HIO" ||
    role === "FACILITY_ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

/** Can move a visit to any stage (doctor side: start consultation, send to lab/pharmacy). Nurses only move it up to "waiting for doctor". */
export function canMoveVisitToAnyStage(role: UserRole | undefined): boolean {
  return canPlaceOrders(role);
}

/** Can finish a visit (this also closes its bill), so only prescribers and admins. */
export function canCompleteVisit(role: UserRole | undefined): boolean {
  return canPlaceOrders(role);
}

// Records officer never opens a clinical folder; nurse/MD do. Records-only
// access is read-only demographics on the visit.
export function canRecordVitals(role: UserRole | undefined): boolean {
  if (!role) return false;
  return role === "NURSE" || role === "MIDWIFE" || role === "MEDICAL_OFFICER" || role === "FACILITY_ADMIN" || role === "SUPER_ADMIN";
}

// ── Role-shaped folder slices ─────────────────────────────────────────────
// Each slice is what the backend's EncounterFolderService.viewFor returns
// for that role. These predicates let UI components decide which tabs to
// render without having to know the full role table.

const LAB_SLICE_ROLES: UserRole[] = ["LAB_SCIENTIST", "LAB_TECH"];
const PHARMACY_SLICE_ROLES: UserRole[] = ["PHARMACIST", "PHARMACY_TECH"];
const BILLING_SLICE_ROLES: UserRole[] = ["BILLING_OFFICER", "FINANCE_OFFICER"];
const RECORDS_SLICE_ROLES: UserRole[] = ["RECORDS_OFFICER"];

export function canViewLabSlice(role: UserRole | undefined): boolean {
  return Boolean(role && LAB_SLICE_ROLES.includes(role));
}

export function canViewPharmacySlice(role: UserRole | undefined): boolean {
  return Boolean(role && PHARMACY_SLICE_ROLES.includes(role));
}

export function canViewBillingSlice(role: UserRole | undefined): boolean {
  return Boolean(role && BILLING_SLICE_ROLES.includes(role));
}

export function canViewRecordsSlice(role: UserRole | undefined): boolean {
  return Boolean(role && RECORDS_SLICE_ROLES.includes(role));
}

/**
 * The discriminator used by `FolderViewDto.kind`. Returns null for roles
 * that have no folder access (the backend would reject the call).
 */
export type FolderSliceKind = "FULL" | "LAB" | "PHARMACY" | "BILLING" | "RECORDS";

export function folderSliceFor(role: UserRole | undefined): FolderSliceKind | null {
  if (canViewFullFolder(role)) return "FULL";
  if (canViewLabSlice(role)) return "LAB";
  if (canViewPharmacySlice(role)) return "PHARMACY";
  if (canViewBillingSlice(role)) return "BILLING";
  if (canViewRecordsSlice(role)) return "RECORDS";
  return null;
}
