"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BookingFormDialog } from "@/components/booking/booking-form-dialog";
import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import type { Patient } from "@/components/records/lib/records-types";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { patientsService } from "@/services/patients.service";

/**
 * The Book tab landing view. Search renders the results list only —
 * the booking detail UI is no longer drawn inline. Selecting a patient
 * opens the booking form in a modal pop-up so the workspace stays at
 * "search results" until the operator commits to a patient.
 */
export function BookingSearchView() {
  const searchParams = useSearchParams();
  const initialPublicId = (searchParams.get("patientPublicId") ?? "").trim();

  const [selected, setSelected] = useState<Patient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!initialPublicId) return;
    let cancelled = false;
    void patientsService.search({ mode: "id", q: initialPublicId }).then((results) => {
      if (cancelled) return;
      const match = results[0];
      if (match) {
        setSelected(patientSummaryToLegacyPatient(match));
        setDialogOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialPublicId]);

  return (
    <div className="space-y-4">
      <PatientSearchPanel
        cardTitle="Find a patient to book"
        cardDescription="Search by hospital number, NHIS number, or name, then choose a patient to book them a slot."
        actionLabel="Book"
        onSelectPatient={(patient) => {
          setSelected(patient);
          setDialogOpen(true);
        }}
      />

      <BookingFormDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setSelected(null);
        }}
        patient={selected}
        patientId={selected?.id ?? null}
      />
    </div>
  );
}
