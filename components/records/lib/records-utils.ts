import { patientsService } from "@/services/patients.service";

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
