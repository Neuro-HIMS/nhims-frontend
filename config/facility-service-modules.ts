import type { AppModule } from "@/types/auth.types";

/**
 * Mirror of backend {@code FacilityCanonicalService} service {@code id} → {@code hmisModuleKey}.
 * Keeps Facility Settings service lines aligned with workspace routes and JWT assignedModules.
 */
export const FACILITY_SERVICE_TO_APP_MODULE: Record<string, AppModule> = {
  emergency: "emergency",
  opd: "opd",
  ipd: "wards",
  maternity_anc: "anc",
  surgical_services: "surgery",
  dental: "dental",
  mental_health: "mental-health",
  laboratory: "laboratory",
  radiology: "radiology",
  pharmacy: "pharmacy",
  physiotherapy: "physiotherapy",
  blood_bank: "blood-bank",
  records_registration: "records",
};

export function appModuleForFacilityServiceId(serviceId: string): AppModule | undefined {
  return FACILITY_SERVICE_TO_APP_MODULE[serviceId];
}
