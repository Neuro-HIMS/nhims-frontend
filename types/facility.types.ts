import type { AppModule } from "@/types/auth.types";

export type FacilityLevel = "PRIMARY" | "SECONDARY" | "TERTIARY";
export type OwnershipType = "PUBLIC" | "PRIVATE" | "MISSION";

export type FacilityServiceCategory = "clinical" | "diagnostic" | "support";

export interface FacilityProfile {
  facilityName: string;
  facilityCode: string;
  facilityLevel: FacilityLevel;
  ownershipType: OwnershipType;
  region: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  isTeachingHospital: boolean;
  isReferralCenter: boolean;
}

export interface FacilityService {
  id: string;
  name: string;
  category: FacilityServiceCategory;
  enabled: boolean;
  targetDaily: number;
  leadUnit: string;
  /** Same key as workspace routes / JWT assignedModules; emitted by the facility settings API. */
  hmisModuleKey?: AppModule;
}

/** Operational defaults persisted under settings.config — aligned with backend normalizer. */
export interface FacilityConfig {
  queueAutoRefreshSec: number;
  appointmentSlotMinutes: number;
  appointmentBookingHorizonDays: number;
  defaultLanguage: "en" | "fr";
  requireTriageBeforeConsultation: boolean;
  enableNhisValidation: boolean;
  enableCriticalLabAlerts: boolean;
  /** How many calendar days staff may back-post clinical documentation (0 = disabled). */
  allowBackdatedClinicalDays: number;
}

export interface FacilitySettingsPayload {
  profile: FacilityProfile;
  services: FacilityService[];
  config: FacilityConfig;
}

export interface FacilitySettingsDto {
  id: string;
  code: string;
  name: string;
  logoDataUrl: string | null;
  settings: Partial<FacilitySettingsPayload> & Record<string, unknown>;
}

export interface FacilitySettingsUpdateRequest {
  name: string;
  settings: FacilitySettingsPayload;
  logoBase64?: string | null;
  logoContentType?: string | null;
  clearLogo: boolean;
}
