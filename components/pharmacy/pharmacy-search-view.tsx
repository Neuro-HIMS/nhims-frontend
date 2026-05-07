"use client";

import { useRouter } from "next/navigation";

import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import type { Patient } from "@/components/records/lib/records-types";

export function PharmacySearchView() {
  const router = useRouter();

  function onSelectPatient(patient: Patient) {
    const uuid = patient.id;
    if (!uuid) return;
    router.push(`/pharmacy?view=patient-rx&patientId=${encodeURIComponent(uuid)}`);
  }

  return (
    <PatientSearchPanel
      cardTitle="Patient Search"
      cardDescription="Find a client by ID, NHIS, or name to open prescriptions for a visit and dispense medication."
      actionLabel="Prescriptions"
      onSelectPatient={onSelectPatient}
    />
  );
}
