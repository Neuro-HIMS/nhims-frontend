export type SearchMode = "id" | "nhis" | "name";
export type VisitType = "opd" | "anc" | "lab" | "radiology" | "ward";

export type Patient = {
  /** Backend UUID — required for authoritative writes (booking, billing). */
  id?: string;
  patientId: string; // public-facing ID e.g. "KBTH-12345678-26"
  firstName: string;
  lastName: string;
  dob: string;
  sex: "M" | "F";
  phone: string;
  district: string;
  nhisCard: string;
  nhisStatus: "active" | "inactive";
};

export type AppointmentForm = {
  appointmentDate: string;
  appointmentTime: string;
  visitType: VisitType;
  serviceId: string;
  price: number;
  priority: "routine" | "urgent";
  clinicianId: string;
  reason: string;
  referralSource: string;
};

export function createDefaultAppointmentForm(): AppointmentForm {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    appointmentDate: date,
    appointmentTime: time,
    visitType: "opd",
    serviceId: "",
    price: 0,
    priority: "routine",
    clinicianId: "",
    reason: "",
    referralSource: "",
  };
}

export type ServiceCatalogItem = {
  id: string;
  name: string;
  department: string;
  visitType: VisitType;
  price: number;
  currency: "GHS";
};

export type Clinician = {
  id: string;
  fullName: string;
  cadre: string;
  department: string;
};

export const EMPTY_APPOINTMENT_FORM: AppointmentForm = {
  appointmentDate: "",
  appointmentTime: "",
  visitType: "opd",
  serviceId: "",
  price: 0,
  priority: "routine",
  clinicianId: "",
  reason: "",
  referralSource: "",
};

export type RegistrationForm = {
  patientId: string;
  clientStatus: "new" | "old";
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  dobUnknown: boolean;
  age: string;
  ageUnit: "months" | "years";
  sex: "" | "M" | "F";
  phone: string;
  altPhone: string;
  region: string;
  address: string;
  maritalStatus: string;
  occupation: string;
  nhisNumber: string;
  nhisStatus: "yes" | "no";
  nhisExpiry: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  bloodGroup: string;
  knownAllergies: string;
  registrationConsentAcknowledged: boolean;
};

export const EMPTY_REGISTRATION_FORM: RegistrationForm = {
  patientId: "",
  clientStatus: "new",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  dobUnknown: false,
  age: "",
  ageUnit: "years",
  sex: "",
  phone: "",
  altPhone: "",
  region: "",
  address: "",
  maritalStatus: "",
  occupation: "",
  nhisNumber: "",
  nhisStatus: "no",
  nhisExpiry: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
  bloodGroup: "",
  knownAllergies: "",
  registrationConsentAcknowledged: false,
};

