import type { TriagePriority, Visit, VisitStatus } from "@/lib/clinical-types";
import type {
  EncounterDto,
  EncounterPriority,
  EncounterStatus,
} from "@/types/clinical.types";

/**
 * Adapter layer that maps the new backend `EncounterDto` onto the legacy
 * frontend `Visit` shape. Existing folder components were authored against
 * `Visit` from the in-browser store; this lets us swap the data source to
 * the API without touching every consumer at once.
 *
 * As individual folder tabs are migrated to native `EncounterDto` reads
 * (Phases 2-7), the conversion can be removed.
 */
export function encounterToVisit(e: EncounterDto): Visit {
  const [appointmentDate, appointmentTimeRaw] = splitScheduledFor(e.scheduledFor ?? e.createdAt ?? "");
  const sex = (e.patientSex || "M").toUpperCase().startsWith("F") ? "F" : "M";
  const visitType = mapVisitType(e.visitType);
  return {
    id: e.id,
    visitNo: e.encounterNumber,
    patientId: e.patientPublicId,
    patientName: e.patientName,
    patientSex: sex,
    patientDob: e.patientDob || "Unknown",
    patientPhone: e.patientPhone || "",
    visitType,
    serviceId: e.appointmentId ?? "",
    serviceName: e.serviceName,
    department: e.department || "",
    clinicianId: e.assignedClinicianId ?? "",
    clinicianName: e.clinicianName || "Unassigned",
    fee: 0,
    sponsor: e.payerType,
    scheme: e.payerType === "NHIS" ? "NATIONAL HEALTH INSURANCE" : e.payerType,
    appointmentDate,
    appointmentTime: appointmentTimeRaw,
    reason: e.reason,
    priority: mapPriority(e.priority),
    status: mapStatus(e.status),
    source: e.appointmentId ? "records" : "walk-in",
    createdAt: e.createdAt ?? new Date().toISOString(),
  };
}

export function mapStatus(status: EncounterStatus): VisitStatus {
  switch (status) {
    case "SCHEDULED":
      return "booked";
    case "CHECKED_IN":
      return "checked-in";
    case "AT_VITALS":
      return "awaiting-vitals";
    case "AT_CONSULTATION":
      return "awaiting-consultation";
    case "IN_CONSULTATION":
      return "in-consultation";
    case "AT_LAB":
      return "awaiting-lab";
    case "AT_PHARMACY":
      return "awaiting-pharmacy";
    case "AT_BILLING":
      return "in-consultation";
    case "ADMITTED":
      return "admitted";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
      return "cancelled";
    default:
      return "booked";
  }
}

/**
 * Inverse of {@link mapStatus} for outbound transitions. Returns the
 * encounter status closest to a chosen UI label.
 */
export function visitStatusToEncounterStatus(s: VisitStatus): EncounterStatus {
  switch (s) {
    case "booked":
      return "SCHEDULED";
    case "checked-in":
      return "CHECKED_IN";
    case "awaiting-triage":
    case "in-triage":
    case "awaiting-vitals":
    case "in-vitals":
      return "AT_VITALS";
    case "awaiting-consultation":
      return "AT_CONSULTATION";
    case "in-consultation":
      return "IN_CONSULTATION";
    case "awaiting-lab":
      return "AT_LAB";
    case "awaiting-pharmacy":
      return "AT_PHARMACY";
    case "admitted":
      return "ADMITTED";
    case "discharged":
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "SCHEDULED";
  }
}

export function mapPriority(p: EncounterPriority | string): TriagePriority {
  switch (p) {
    case "EMERGENCY":
      return "emergency";
    case "URGENT":
      return "urgent";
    case "ROUTINE":
      return "routine";
    default:
      return "pending";
  }
}

export function priorityToEncounter(p: TriagePriority): EncounterPriority {
  switch (p) {
    case "emergency":
      return "EMERGENCY";
    case "urgent":
    case "semi":
      return "URGENT";
    case "routine":
      return "ROUTINE";
    case "pending":
    default:
      return "ROUTINE";
  }
}

function mapVisitType(v: string): Visit["visitType"] {
  switch ((v ?? "").toUpperCase()) {
    case "ANC":
      return "anc";
    case "LAB":
      return "lab";
    case "RADIOLOGY":
      return "radiology";
    case "WARD":
      return "ward";
    case "OPD":
    default:
      return "opd";
  }
}

function splitScheduledFor(iso: string): [string, string] {
  if (!iso) return ["", ""];
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return ["", ""];
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return [date, time];
  } catch {
    return ["", ""];
  }
}
