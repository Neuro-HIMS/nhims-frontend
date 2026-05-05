import { FACILITY_PROFILE, MOCK_NHIS_DIRECTORY, PATIENTS } from "@/components/records/lib/records-data";
import type { NhisLookup } from "@/components/records/lib/records-types";

export const USED_PATIENT_IDS = new Set<string>(PATIENTS.map((patient) => patient.patientId));

export function buildFacilityPrefix(name: string) {
  const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "FAC").padEnd(3, "X");
}

export function generatePatientId() {
  const year2 = String(new Date().getFullYear()).slice(-2);
  const prefix = buildFacilityPrefix(FACILITY_PROFILE.name);

  let candidate = "";
  do {
    const sequence = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    candidate = `${prefix}-${sequence}-${year2}`;
  } while (USED_PATIENT_IDS.has(candidate));

  USED_PATIENT_IDS.add(candidate);
  return candidate;
}

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

export function mockValidateNhis(nhisNumber: string): Promise<NhisLookup | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = MOCK_NHIS_DIRECTORY[nhisNumber.trim().toUpperCase()];
      resolve(data ?? null);
    }, 700);
  });
}


