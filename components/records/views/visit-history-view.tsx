"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VISIT_TYPES } from "@/components/booking/lib/booking-types";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { StatusPill } from "@/components/common/status-pill";
import { PageCard } from "@/components/layouts/page-card";
import { searchPatientsFreeText } from "@/components/records/lib/records-utils";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { encounterStatusLabel, encounterStatusTone } from "@/lib/status-labels";
import { formatTableDateTime } from "@/lib/dates";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import type { EncounterDto } from "@/types/clinical.types";
import type { PatientSummaryDto } from "@/types/patients.types";

const WHERE_LABELS: Record<string, string> = Object.fromEntries(VISIT_TYPES.map((v) => [v.value, v.label]));

const PAY_LABELS: Record<string, string> = {
  NHIS: "NHIS",
  CASH: "Self-pay",
  CORPORATE: "Company",
  INSURANCE_PRIVATE: "Private insurance",
  DONOR: "Donor",
  CAPITATION: "Capitation",
  IGF: "IGF",
};

export function VisitHistoryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("patientId"));

  const [query, setQuery] = useState("");
  const [searchedTerm, setSearchedTerm] = useState<string | null>(null);
  const [results, setResults] = useState<PatientSummaryDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<unknown>(null);

  const patientQuery = useQuery({
    queryKey: selectedId ? queryKeys.patients.detail(selectedId) : ["patients", "detail", "idle"],
    queryFn: () => patientsService.getById(selectedId!),
    enabled: Boolean(selectedId),
  });

  const visitsQuery = useQuery({
    queryKey: selectedId ? queryKeys.clinical.byPatient(selectedId) : ["clinical", "by-patient", "idle"],
    queryFn: () => clinicalService.byPatient(selectedId!),
    enabled: Boolean(selectedId),
  });

  async function runSearch() {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    setSearchError(null);
    setSearchedTerm(term);
    try {
      const data = await searchPatientsFreeText(term);
      setResults(data);
    } catch (error) {
      setSearchError(error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function selectPatient(id: string) {
    setSelectedId(id);
    router.replace(`/records?view=visits&patientId=${id}`);
  }

  function findDifferentPatient() {
    setSelectedId(null);
    setResults([]);
    setSearchedTerm(null);
    setQuery("");
    router.replace("/records?view=visits");
  }

  if (!selectedId) {
    return (
      <div className="space-y-4">
        <PageCard title="Visit history" description="Find a patient to see their past visits." />
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by hospital number or full name"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button onClick={runSearch} disabled={searching || !query.trim()}>
              <Search className="mr-1.5 h-4 w-4" />
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
          <div className="mt-4">
            {Boolean(searchError) && <ErrorState error={searchError} onRetry={runSearch} />}
            {!searchError && searchedTerm && !searching && results.length === 0 && (
              <EmptyState
                illustration="no-results"
                title={`No patient found for "${searchedTerm}"`}
                description="Check the spelling or try their hospital number."
              />
            )}
            {!searchedTerm && !searching && (
              <EmptyState illustration="choose-patient" title="Search for a patient" description="Their visit history will appear here once found." />
            )}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r) => (
                  <PatientResultCard
                    key={r.id}
                    patient={patientSummaryToLegacyPatient(r)}
                    onSelect={() => selectPatient(r.id)}
                    showBookButton={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const patientName = patientQuery.data ? `${patientQuery.data.firstName} ${patientQuery.data.lastName}` : "this patient";

  const columns: DataTableColumn<EncounterDto>[] = [
    {
      key: "date",
      header: "Date",
      cell: (e) => (
        <span className="font-clinical text-xs text-muted-foreground">
          {e.scheduledFor ? formatTableDateTime(e.scheduledFor) : "—"}
        </span>
      ),
    },
    {
      key: "visitNo",
      header: "Visit number",
      cell: (e) => <span className="font-clinical text-xs">{e.encounterNumber}</span>,
    },
    { key: "where", header: "Where", cell: (e) => WHERE_LABELS[e.visitType] ?? e.visitType },
    { key: "doctor", header: "Doctor", cell: (e) => e.clinicianName || "—", hideOnTablet: true },
    {
      key: "stage",
      header: "Stage",
      cell: (e) => <StatusPill tone={encounterStatusTone(e.status)}>{encounterStatusLabel(e.status)}</StatusPill>,
    },
    {
      key: "payment",
      header: "Payment",
      cell: (e) => PAY_LABELS[e.payerType] ?? (e.payerType || "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageCard
        title="Visit history"
        description={`Past visits for ${patientName}.`}
        actions={
          <Button variant="outline" onClick={findDifferentPatient}>
            Find a different patient
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={visitsQuery.isPending ? undefined : visitsQuery.data}
        getRowId={(e) => e.id}
        isLoading={visitsQuery.isPending}
        error={visitsQuery.isError ? visitsQuery.error : undefined}
        onRetry={() => void visitsQuery.refetch()}
        empty={{
          illustration: "empty-list",
          title: `No visits yet for ${patientName}`,
          description: "Visits will appear here once they've been seen at this facility.",
        }}
      />
    </div>
  );
}
