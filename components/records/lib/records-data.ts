import type {
  Clinician,
  NhisLookup,
  Patient,
  ServiceCatalogItem,
} from "@/components/records/lib/records-types";

export const RECORDS_NAV = [
  { label: "Client Lookup", view: "search", href: "/records?view=search" },
  { label: "First-Time Registration", view: "register", href: "/records?view=register" },
];

export const FACILITY_PROFILE = {
  name: "Kaneshie Polyclinic",
};

export const PATIENTS: Patient[] = [
  {
    patientId: "GH-2026-04821",
    firstName: "Kofi",
    lastName: "Acheampong",
    dob: "1985-03-12",
    sex: "M",
    phone: "0244123456",
    district: "Accra Metropolitan",
    nhisCard: "GH/12345678-01",
    nhisStatus: "active",
  },
  {
    patientId: "GH-2026-03109",
    firstName: "Abena",
    lastName: "Osei",
    dob: "1992-07-22",
    sex: "F",
    phone: "0201987654",
    district: "Kumasi Metropolitan",
    nhisCard: "GH/98765432-02",
    nhisStatus: "active",
  },
  {
    patientId: "GH-2026-01774",
    firstName: "Kwame",
    lastName: "Mensah",
    dob: "1968-11-30",
    sex: "M",
    phone: "0277654321",
    district: "Cape Coast",
    nhisCard: "",
    nhisStatus: "inactive",
  },
  {
    patientId: "GH-2026-05512",
    firstName: "Esi",
    lastName: "Yeboah",
    dob: "2001-05-08",
    sex: "F",
    phone: "0554332211",
    district: "Tema Metropolitan",
    nhisCard: "GH/55443322-03",
    nhisStatus: "active",
  },
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

export const MOCK_NHIS_DIRECTORY: Record<string, NhisLookup> = {
  "GH/12345678-01": { status: "yes", expiryDate: "2027-04-15", fullName: "Kofi Acheampong" },
  "GH/98765432-02": { status: "yes", expiryDate: "2026-12-20", fullName: "Abena Osei" },
  "GH/55443322-03": { status: "yes", expiryDate: "2026-10-01", fullName: "Esi Yeboah" },
  "NH-00000001": { status: "no", expiryDate: "", fullName: "Status Inactive" },
};

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

