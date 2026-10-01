"use client";

import { useQuery } from "@tanstack/react-query";

import { allergyClash } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";

export interface AllergyCheck {
  /** Both the allergy alerts and the patient's allergy text have loaded. */
  ready: boolean;
  /** One of them failed: treat medicines as unchecked and don't let them be sent or given. */
  failed: boolean;
  retry: () => void;
  /** The allergy a medicine may clash with; null when none (only meaningful when `ready`). */
  clashFor: (medicine: string) => { allergy: string; blocking: boolean } | null;
}

/**
 * The allergy safety check for prescribing, dispensing and treatments. Never reports
 * "no clash" while the data is loading or after it failed — callers block on `!ready`.
 */
export function useAllergyCheck(patientId: string | null | undefined): AllergyCheck {
  const enabled = Boolean(patientId);
  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId ?? ""),
    queryFn: () => patientsService.getById(patientId!),
    enabled,
  });
  const alertsQuery = useQuery({
    queryKey: queryKeys.clinical.alerts(patientId ?? ""),
    queryFn: () => clinicalService.listAlerts(patientId!),
    enabled,
  });
  const ready = enabled && patientQuery.isSuccess && alertsQuery.isSuccess;
  return {
    ready,
    failed: patientQuery.isError || alertsQuery.isError,
    retry: () => {
      if (patientQuery.isError) void patientQuery.refetch();
      if (alertsQuery.isError) void alertsQuery.refetch();
    },
    clashFor: (medicine) => (ready ? allergyClash(medicine, alertsQuery.data ?? [], patientQuery.data?.knownAllergies) : null),
  };
}
