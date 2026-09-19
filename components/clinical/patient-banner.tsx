"use client";

import { useQuery } from "@tanstack/react-query";

import { AllergyPill } from "@/components/clinical/allergy-pill";
import { NhisPill } from "@/components/clinical/nhis-pill";
import { TriagePill } from "@/components/clinical/triage-pill";
import { BannerSkeleton } from "@/components/common/skeletons";
import { ErrorState } from "@/components/common/error-state";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import type { TriagePriorityCode } from "@/types/clinical.types";

function knownAllergiesList(raw: string | undefined): string[] {
  const text = raw?.trim();
  if (!text || text.toLowerCase() === "none known" || text.toLowerCase() === "no known allergies") return [];
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Patient identity strip shown at the top of every clinical screen — same
 * shape everywhere (03-components.md §4). Loads its own data from a patient
 * id; pass an encounter id too to also show that visit's triage and number.
 */
export function PatientBanner({ patientId, encounterId }: { patientId: string; encounterId?: string }) {
  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => patientsService.getById(patientId),
    enabled: Boolean(patientId),
  });

  const encounterQuery = useQuery({
    queryKey: encounterId ? queryKeys.clinical.encounter(encounterId) : ["clinical", "encounter", "idle"],
    queryFn: () => clinicalService.byId(encounterId!),
    enabled: Boolean(encounterId),
  });

  if (patientQuery.isPending) return <BannerSkeleton />;
  if (patientQuery.isError) {
    return <ErrorState error={patientQuery.error} onRetry={() => void patientQuery.refetch()} />;
  }

  const patient = patientQuery.data;
  const encounter = encounterQuery.data;
  const allergies = knownAllergiesList(patient.knownAllergies);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="patient-id mt-0.5">
            {patient.ageDisplay} · {patient.sex === "F" ? "Female" : "Male"} · {patient.patientPublicId}
            {encounter && ` · Visit ${encounter.encounterNumber}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NhisPill status={patient.nhisActive ? "ACTIVE" : "INACTIVE"} />
          {encounter && <TriagePill priority={(encounter.priority as TriagePriorityCode) || "PENDING"} />}
          <AllergyPill allergies={allergies} />
        </div>
      </div>
    </div>
  );
}
