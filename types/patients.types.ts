/** Mirrors backend {@code PatientDto} — snake_case JSON from Spring maps to camelCase here. */
export interface PatientDto {
  id: string;
  patientPublicId: string;
  clientStatus: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string | null;
  dobUnknown: boolean;
  statedAgeValue: number | null;
  statedAgeUnit: string | null;
  sex: string;
  ageDisplay: string;
  dobDisplay: string;
  phone: string;
  altPhone: string;
  region: string;
  address: string;
  maritalStatus: string;
  occupation: string;
  nhisMemberNumber: string;
  nhisActive: boolean;
  nhisExpiryDate: string | null;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  facilityName: string;
  facilityLogoDataUrl: string | null;
  bloodGroup?: string;
  knownAllergies?: string;
  registrationConsentRecorded?: boolean;
  registrationConsentAt?: string | null;
}

export interface NextPatientReferenceDto {
  patientPublicId: string;
}

/** Mirrors backend {@code NhisVerificationResultDto}. */
export interface NhisVerificationResultDto {
  status: "VERIFIED" | "NOT_FOUND" | "PENDING_GATEWAY" | "INVALID_FORMAT";
  memberName: string | null;
  scheme: string | null;
  validUntil: string | null;
  message: string | null;
}

/** Body shape matches backend {@code RegisterPatientRequest}. */
export interface PatientSummaryDto {
  id: string;
  patientPublicId: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  nhisActive: boolean;
  nhisMemberNumber: string;
  dobDisplay: string;
  sex: string;
}

export type PatientSearchParams =
  | { mode: "id"; q: string }
  | { mode: "nhis"; q: string }
  | { mode: "name"; firstName: string; lastName: string };

export interface RegisterPatientPayload {
  clientStatus: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  dobUnknown: boolean;
  age: string;
  ageUnit: string;
  sex: string;
  phone: string;
  altPhone: string;
  region: string;
  address: string;
  maritalStatus: string;
  occupation: string;
  nhisNumber: string;
  nhisStatus: string;
  nhisExpiry: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  bloodGroup: string;
  knownAllergies: string;
  registrationConsentAcknowledged: boolean;
}

export interface UpdatePatientPayload {
  clientStatus: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  dobUnknown: boolean;
  age: string;
  ageUnit: string;
  sex: string;
  phone: string;
  altPhone: string;
  region: string;
  address: string;
  maritalStatus: string;
  occupation: string;
  nhisNumber: string;
  nhisStatus: string;
  nhisExpiry: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  bloodGroup: string;
  knownAllergies: string;
}
