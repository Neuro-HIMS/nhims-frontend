import { patientsService } from "@/services/patients.service";
import type { PatientSummaryDto } from "@/types/patients.types";

export function calculateAgeFromDob(dob: string): { age: number; unit: "months" | "years" } {
  const birthDate = new Date(dob);
  const today = new Date();
  const months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    (today.getMonth() - birthDate.getMonth()) -
    (today.getDate() < birthDate.getDate() ? 1 : 0);

  if (months < 12) {
    return { age: Math.max(months, 0), unit: "months" };
  }

  return { age: Math.floor(months / 12), unit: "years" };
}

export function verifyNhisMembership(memberNumber: string) {
  return patientsService.verifyNhis(memberNumber);
}

/** Hospital numbers are FACILITYCODE-12345678-YY; a bare digit run is treated as an NHIS number. */
export function detectSearchMode(raw: string): "id" | "nhis" | "name" {
  const trimmed = raw.trim();
  if (!trimmed) return "name";
  const compact = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{2,8}\d{10}$/.test(compact)) return "id";
  if (/^\d{6,}$/.test(compact)) return "nhis";
  return "name";
}

/** First word is the first name, the rest (if any) is the last name — good enough for a one-box search. */
export function splitFullName(raw: string): { firstName: string; lastName: string } {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** One free-text box that dispatches to whichever search mode the term looks like — including a single-word name. */
export function searchPatientsFreeText(term: string): Promise<PatientSummaryDto[]> {
  const mode = detectSearchMode(term);
  if (mode === "name") {
    const { firstName, lastName } = splitFullName(term);
    return patientsService.search({ mode: "name", firstName, lastName });
  }
  return patientsService.search({ mode, q: term.trim() });
}
