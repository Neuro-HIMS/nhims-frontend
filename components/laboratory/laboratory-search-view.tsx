"use client";

import { useRouter } from "next/navigation";

import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import type { Patient } from "@/components/records/lib/records-types";

export function LaboratorySearchView() {
  const router = useRouter();

  function onSelectPatient(patient: Patient) {
    const uuid = patient.id;
    if (!uuid) return;
    router.push(`/laboratory?view=patient-labs&patientId=${encodeURIComponent(uuid)}`);
  }

  return (
    <PatientSearchPanel
      cardTitle="Patient Search"
      cardDescription="Find a client by ID, NHIS, or name to view their encounter lab orders and jump to result entry."
      actionLabel="Lab orders"
      onSelectPatient={onSelectPatient}
    />
  );
}
