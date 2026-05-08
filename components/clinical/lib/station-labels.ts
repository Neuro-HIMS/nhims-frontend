import type { EncounterStation } from "@/types/clinical.types";

const LABELS: Record<EncounterStation, string> = {
  RECEPTION: "Reception",
  VITALS: "Vitals / triage",
  CONSULTATION: "Consultation",
  LAB: "Laboratory",
  PHARMACY: "Pharmacy",
  BILLING: "Billing / cashier",
  WARD: "Ward / IPD",
  COMPLETED: "Visit completed",
};

export function formatEncounterStation(station: EncounterStation | string | undefined | null): string {
  if (station == null || station === "") return "—";
  return LABELS[station as EncounterStation] ?? String(station);
}
