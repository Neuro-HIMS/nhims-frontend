import type { UserRole } from "@/types/auth.types";

/** Plain-language names for backend role codes — never show a role code on screen. */
export const ROLE_LABELS: Record<UserRole, string> = {
  RECORDS_OFFICER: "Records officer",
  NURSE: "Nurse",
  MEDICAL_OFFICER: "Doctor",
  MIDWIFE: "Midwife",
  LAB_SCIENTIST: "Lab scientist",
  LAB_TECH: "Lab technician",
  PHARMACIST: "Pharmacist",
  PHARMACY_TECH: "Pharmacy technician",
  RADIOGRAPHER: "Radiographer",
  FINANCE_OFFICER: "Finance officer",
  BILLING_OFFICER: "Cashier",
  HIO: "Health information officer",
  FACILITY_ADMIN: "Facility administrator",
  SUPER_ADMIN: "System administrator",
};

export function roleLabel(role: UserRole | string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}
