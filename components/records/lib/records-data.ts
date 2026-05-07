import type { Clinician, ServiceCatalogItem } from "@/components/records/lib/records-types";

export const RECORDS_NAV = [
  { label: "Client Lookup", view: "search", href: "/records?view=search" },
  { label: "First-Time Registration", view: "register", href: "/records?view=register" },
  { label: "Patient Records", view: "manage", href: "/records?view=manage" },
  { label: "Visit History", view: "visits", href: "/records?view=visits" },
];

export const OCCUPATION_OPTIONS = [
  "Trader",
  "Teacher",
  "Farmer",
  "Seamstress",
  "Nurse",
  "Driver",
  "Student",
  "Civil Servant",
  "Security Officer",
  "Hairdresser",
  "Electrician",
  "Unemployed",
];

export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];

/** Stored uppercase; empty string means not recorded at registration. */
export const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Not recorded" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    id: "general-opd-initial",
    name: "General OPD - Initial Consultation",
    department: "General OPD",
    visitType: "opd",
    price: 70,
    currency: "GHS",
  },
  {
    id: "maternity-anc-review",
    name: "ANC Review",
    department: "Maternity",
    visitType: "anc",
    price: 55,
    currency: "GHS",
  },
  {
    id: "pediatrics-consult",
    name: "Pediatrics Consultation",
    department: "Pediatrics",
    visitType: "opd",
    price: 65,
    currency: "GHS",
  },
  {
    id: "laboratory-basic-panel",
    name: "Laboratory Basic Panel",
    department: "Laboratory",
    visitType: "lab",
    price: 120,
    currency: "GHS",
  },
  {
    id: "radiology-xray",
    name: "Radiology X-Ray",
    department: "Radiology",
    visitType: "radiology",
    price: 150,
    currency: "GHS",
  },
];

export const CLINICIANS: Clinician[] = [
  { id: "CL-001", fullName: "Dr. Kwame Asante", cadre: "Medical Officer", department: "General OPD" },
  { id: "CL-002", fullName: "Dr. Afia Boateng", cadre: "Family Physician", department: "Family Medicine" },
  { id: "CL-003", fullName: "Midwife Adwoa Mensah", cadre: "Midwife", department: "Maternity" },
  { id: "CL-004", fullName: "Dr. Nana Yeboah", cadre: "Pediatrician", department: "Pediatrics" },
  { id: "CL-005", fullName: "MLT Samuel Owusu", cadre: "Medical Laboratory Scientist", department: "Laboratory" },
];

