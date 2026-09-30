import type { UserRole } from "@/types/auth.types";
import type { PillTone } from "@/components/common/status-pill";

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

/** Plain-language names for a clinical encounter's stage — records/nurse/doctor visit history and queues. */
export const ENCOUNTER_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Booked",
  CHECKED_IN: "Checked in",
  AT_VITALS: "Waiting for vitals",
  AT_CONSULTATION: "Waiting for doctor",
  IN_CONSULTATION: "With doctor",
  AT_LAB: "At the lab",
  AT_PHARMACY: "At pharmacy",
  AT_BILLING: "At billing",
  ADMITTED: "Admitted",
  COMPLETED: "Visit completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Didn't come",
};

const ENCOUNTER_STATUS_TONE: Record<string, PillTone> = {
  SCHEDULED: "neutral",
  CHECKED_IN: "info",
  AT_VITALS: "pending",
  AT_CONSULTATION: "pending",
  IN_CONSULTATION: "pending",
  AT_LAB: "pending",
  AT_PHARMACY: "pending",
  AT_BILLING: "pending",
  ADMITTED: "purple",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "error",
};

export function encounterStatusLabel(status: string): string {
  return ENCOUNTER_STATUS_LABELS[status] ?? status;
}

export function encounterStatusTone(status: string): PillTone {
  return ENCOUNTER_STATUS_TONE[status] ?? "neutral";
}

/** Plain-language names for a booked appointment's status (scheduling, not the clinical visit itself). */
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Booked",
  CHECKED_IN: "Arrived",
  IN_PROGRESS: "Being seen",
  COMPLETED: "Done",
  NO_SHOW: "Didn't come",
  CANCELLED: "Cancelled",
};

const APPOINTMENT_STATUS_TONE: Record<string, PillTone> = {
  SCHEDULED: "pending",
  CHECKED_IN: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  NO_SHOW: "error",
  CANCELLED: "neutral",
};

export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

export function appointmentStatusTone(status: string): PillTone {
  return APPOINTMENT_STATUS_TONE[status] ?? "neutral";
}

type Labelled = { label: string; tone: PillTone };
const pick = (map: Record<string, Labelled>, code: string, fallback: Labelled): Labelled => map[code] ?? fallback;

/** Referrals — Sent · Accepted · Declined · Done. */
export function referralStatus(code: string): Labelled {
  return pick(
    {
      PENDING: { label: "Sent", tone: "pending" },
      ACCEPTED: { label: "Accepted", tone: "info" },
      REJECTED: { label: "Declined", tone: "error" },
      COMPLETED: { label: "Done", tone: "success" },
    },
    code,
    { label: "Sent", tone: "pending" },
  );
}

export function referralUrgency(code: string): Labelled {
  return pick(
    { ROUTINE: { label: "Routine", tone: "neutral" }, URGENT: { label: "Urgent", tone: "warning" }, STAT: { label: "Immediately", tone: "error" } },
    code,
    { label: "Routine", tone: "neutral" },
  );
}

export const ALERT_CATEGORY_LABELS: Record<string, string> = {
  ALLERGY: "Allergy",
  CHRONIC: "Long-term condition",
  INFECTIOUS: "Infection risk",
  IMPLANT: "Implant or device",
  GENERAL: "Other",
};

export function alertSeverity(code: string): Labelled {
  return pick(
    {
      LOW: { label: "Low", tone: "neutral" },
      MEDIUM: { label: "Medium", tone: "warning" },
      HIGH: { label: "High", tone: "error" },
      CRITICAL: { label: "Critical", tone: "error" },
    },
    code,
    { label: "Medium", tone: "warning" },
  );
}

export function treatmentStatus(code: string): Labelled {
  return pick(
    {
      ORDERED: { label: "Ordered", tone: "pending" },
      ADMINISTERED: { label: "Given", tone: "success" },
      WITHHELD: { label: "Held back", tone: "warning" },
      CANCELLED: { label: "Cancelled", tone: "neutral" },
    },
    code,
    { label: "Ordered", tone: "pending" },
  );
}

export const DISCHARGE_OUTCOME_LABELS: Record<string, string> = {
  IMPROVED: "Improved",
  STABLE: "Stable",
  AMA: "Left against medical advice",
  TRANSFERRED: "Transferred",
  DECEASED: "Died",
  OTHER: "Other",
};
