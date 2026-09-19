"use client";

import { useRouter } from "next/navigation";

import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import type { Patient } from "@/components/records/lib/records-types";

export function NurseSearchView() {
  const router = useRouter();

  function openFolder(patient: Patient) {
    if (!patient.id) return;
    router.push(`/nurse?view=folder&patientId=${encodeURIComponent(patient.id)}`);
  }

  return (
    <PatientSearchPanel
      cardTitle="Find a patient"
      cardDescription="Search by hospital number, NHIS number, or name to open their folder."
      actionLabel="Open folder"
      onSelectPatient={openFolder}
    />
  );
}
