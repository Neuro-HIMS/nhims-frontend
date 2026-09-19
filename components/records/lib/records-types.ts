export type SearchMode = "id" | "nhis" | "name" | "any";

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

