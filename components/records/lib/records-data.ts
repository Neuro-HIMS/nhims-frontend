export const RECORDS_NAV = [
  { label: "Find a patient", view: "search", href: "/records?view=search" },
  { label: "Register new patient", view: "register", href: "/records?view=register" },
  { label: "Patient details", view: "manage", href: "/records?view=manage" },
  { label: "Visit history", view: "visits", href: "/records?view=visits" },
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


