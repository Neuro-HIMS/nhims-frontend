export type AppModule =
  | "dashboard"
  | "records"
  | "appointments"
  | "emergency"
  | "opd"
  | "nurse"
  | "wards"
  | "anc"
  | "surgery"
  | "dental"
  | "mental-health"
  | "laboratory"
  | "pharmacy"
  | "radiology"
  | "physiotherapy"
  | "blood-bank"
  | "finance"
  | "billing"
  | "reports"
  | "users"
  | "facility"
  | "audit-log";

export type UserRole =
  | "RECORDS_OFFICER"
  | "NURSE"
  | "MEDICAL_OFFICER"
  | "MIDWIFE"
  | "LAB_SCIENTIST"
  | "LAB_TECH"
  | "PHARMACIST"
  | "PHARMACY_TECH"
  | "RADIOGRAPHER"
  | "FINANCE_OFFICER"
  | "BILLING_OFFICER"
  | "HIO"
  | "FACILITY_ADMIN"
  | "SUPER_ADMIN";

export interface AuthUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  assignedModules: AppModule[];
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  email: string;
  /** Data URL from API when facility logo is set; drives header branding after /me or reissue */
  facilityLogoDataUrl?: string | null;
  /**
   * Facility Settings → Services: HMIS module keys currently enabled for this site.
   * When absent (legacy JWT), navigation does not hide tabs by facility toggle.
   */
  enabledHmisModuleKeys?: AppModule[];
  /** After admin password reset; user must complete /change-password before full workspace access. */
  mustChangePassword?: boolean;
  /** True when two-factor (TOTP) is enabled for this account. */
  totpEnabled?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export interface Session {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}
