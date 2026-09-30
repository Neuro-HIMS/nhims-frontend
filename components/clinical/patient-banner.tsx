"use client";

import { useQuery } from "@tanstack/react-query";

import { AllergyPill } from "@/components/clinical/allergy-pill";
import { NhisPill, type NhisStatus } from "@/components/clinical/nhis-pill";
import { TriagePill } from "@/components/clinical/triage-pill";
import { BannerSkeleton } from "@/components/common/skeletons";
import { ErrorState } from "@/components/common/error-state";
import { canReadAlerts, canReadPatients } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/store/auth.store";
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

function mergeAllergies(fromText: string[], fromAlerts: string[]): string[] {
  const seen = new Set<string>();
  return [...fromAlerts, ...fromText].filter((a) => {
    const k = a.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function nhisStatusOf(p: { nhisActive: boolean; nhisMemberNumber?: string | null; nhisExpiryDate?: string | null }): NhisStatus {
  if (p.nhisActive) return "ACTIVE";
  if (!p.nhisMemberNumber?.trim()) return "NONE";
  if (p.nhisExpiryDate && new Date(p.nhisExpiryDate).getTime() < Date.now()) return "INACTIVE";
  return "PENDING";
}

/**
 * Patient identity strip shown at the top of every clinical screen — same
 * shape everywhere (03-components.md §4). Loads its own data from a patient
 * id; pass an encounter id too to also show that visit's triage and number.
 */
export interface PatientBannerFallback {
  name: string;
  hospitalNumber: string;
  sex?: string | null;
  dob?: string | null;
}

/**
 * `fallback`: identity carried on the request itself (e.g. a scan order), shown when this role
 * isn't allowed to read the full patient record (radiographers) — never an error for that.
 */
export function PatientBanner({
  patientId,
  encounterId,
  fallback,
}: {
  patientId: string;
  encounterId?: string;
  fallback?: PatientBannerFallback;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const mayRead = canReadPatients(role);
  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => patientsService.getById(patientId),
    enabled: Boolean(patientId) && mayRead,
  });

  // Allergy alerts are the safety record (what prescribing checks), so the banner must show them
  // even when the registration allergy text says "No known allergies".
  const alertsQuery = useQuery({
    queryKey: queryKeys.clinical.alerts(patientId),
    queryFn: () => clinicalService.listAlerts(patientId),
    enabled: Boolean(patientId) && mayRead && canReadAlerts(role),
    retry: false,
  });

  const encounterQuery = useQuery({
    queryKey: encounterId ? queryKeys.clinical.encounter(encounterId) : ["clinical", "encounter", "idle"],
    queryFn: () => clinicalService.byId(encounterId!),
    enabled: Boolean(encounterId),
  });

  if (!mayRead) return fallback ? <BasicBanner fallback={fallback} visitNumber={encounterQuery.data?.encounterNumber} /> : null;
  if (patientQuery.isPending) return <BannerSkeleton />;
  if (patientQuery.isError) {
    if (fallback) return <BasicBanner fallback={fallback} visitNumber={encounterQuery.data?.encounterNumber} />;
    return <ErrorState error={patientQuery.error} onRetry={() => void patientQuery.refetch()} />;
  }

  const patient = patientQuery.data;
  const encounter = encounterQuery.data;
  const allergies = mergeAllergies(
    knownAllergiesList(patient.knownAllergies),
    (alertsQuery.data ?? []).filter((a) => a.active && a.category === "ALLERGY").map((a) => a.label),
  );

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="patient-id mt-0.5">
            {patient.ageDisplay} · {patient.sex === "F" ? "Female" : patient.sex === "M" ? "Male" : "Sex not recorded"} · {patient.patientPublicId}
            {encounter && ` · Visit ${encounter.encounterNumber}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NhisPill status={nhisStatusOf(patient)} />
          {encounter && <TriagePill priority={(encounter.priority as TriagePriorityCode) || "PENDING"} />}
          <AllergyPill allergies={allergies} />
        </div>
      </div>
    </div>
  );
}

/** "32 years" / "8 months", matching the full banner. */
function ageInWords(dob: string): string | null {
  const ms = new Date().getTime() - new Date(dob).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  if (years >= 1) return `${years} year${years === 1 ? "" : "s"}`;
  const months = Math.floor(ms / (30.44 * 24 * 3600 * 1000));
  return `${months} month${months === 1 ? "" : "s"}`;
}

function BasicBanner({ fallback, visitNumber }: { fallback: PatientBannerFallback; visitNumber?: string }) {
  const sex = (fallback.sex ?? "").toUpperCase().startsWith("F") ? "Female" : (fallback.sex ?? "").toUpperCase().startsWith("M") ? "Male" : null;
  const age = fallback.dob ? ageInWords(fallback.dob) : null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="truncate text-base font-semibold text-foreground">{fallback.name}</p>
      <p className="patient-id mt-0.5">
        {[age, sex, fallback.hospitalNumber, visitNumber ? `Visit ${visitNumber}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}
