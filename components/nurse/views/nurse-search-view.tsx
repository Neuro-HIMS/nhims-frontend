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
      cardTitle="Patient Search"
      cardDescription="Search registered patients from your facility MPI to open their folder for vitals, notes, and care continuation."
      actionLabel="Open Folder"
      onSelectPatient={openFolder}
    />
  );
}
