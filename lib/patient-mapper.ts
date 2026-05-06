import type { Patient } from "@/components/records/lib/records-types";
import type { PatientDto, PatientSummaryDto } from "@/types/patients.types";

export function patientSummaryToLegacyPatient(s: PatientSummaryDto): Patient {
  return {
    id: s.id,
    patientId: s.patientPublicId,
    firstName: s.firstName,
    lastName: s.lastName,
    dob: s.dobDisplay,
    sex: s.sex === "F" ? "F" : "M",
    phone: s.phone,
    district: s.region?.trim() ? s.region : "—",
    nhisCard: s.nhisMemberNumber ?? "",
    nhisStatus: s.nhisActive ? "active" : "inactive",
  };
}

export function patientDtoToLegacyPatient(d: PatientDto): Patient {
  return {
    id: d.id,
    patientId: d.patientPublicId,
    firstName: d.firstName,
    lastName: d.lastName,
    dob: d.dobDisplay === "Unknown" ? "Unknown" : d.dobDisplay,
    sex: d.sex === "F" ? "F" : "M",
    phone: d.phone,
    district: d.region?.trim() ? d.region : "—",
    nhisCard: d.nhisMemberNumber ?? "",
    nhisStatus: d.nhisActive ? "active" : "inactive",
  };
}
