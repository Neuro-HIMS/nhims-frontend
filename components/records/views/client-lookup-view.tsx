"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Search, UserPlus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageCard } from "@/components/layouts/page-card";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { StartVisitDialog } from "@/components/records/start-visit-dialog";
import type { Patient, SearchMode } from "@/components/records/lib/records-types";
import { detectSearchMode, splitFullName } from "@/components/records/lib/records-utils";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { formatPatientPublicIdLive } from "@/lib/patient-public-id";
import { queryKeys } from "@/lib/query-keys";
import { patientsService } from "@/services/patients.service";
import type { PatientSearchParams } from "@/types/patients.types";

const MODE_TABS: Array<{ id: SearchMode; label: string }> = [
  { id: "any", label: "Anything" },
  { id: "id", label: "Hospital number" },
  { id: "nhis", label: "NHIS number" },
  { id: "name", label: "Name" },
];

function toParams(mode: SearchMode, query: string, firstName: string, lastName: string): PatientSearchParams | null {
  if (mode === "name") {
    if (!firstName.trim() && !lastName.trim()) return null;
    return { mode: "name", firstName: firstName.trim(), lastName: lastName.trim() };
  }
  if (!query.trim() || query.trim().length < 2) return null;
  if (mode === "any") {
    const detected = detectSearchMode(query);
    if (detected === "name") {
      const split = splitFullName(query);
      return { mode: "name", firstName: split.firstName, lastName: split.lastName };
    }
    return { mode: detected, q: query.trim() };
  }
  return { mode, q: query.trim() };
}

export function ClientLookupView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<SearchMode>("any");
  const [query, setQuery] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [visitPatient, setVisitPatient] = useState<Patient | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const activeSearch = useMemo(
    () => toParams(mode, debouncedQuery, firstName, lastName),
    [mode, debouncedQuery, firstName, lastName],
  );

  const searchQuery = useQuery({
    queryKey: activeSearch
      ? queryKeys.patients.search(
          activeSearch.mode === "name"
            ? { mode: activeSearch.mode, firstName: activeSearch.firstName, lastName: activeSearch.lastName }
            : { mode: activeSearch.mode, q: activeSearch.q },
        )
      : ["patients", "search", "idle"],
    queryFn: () => patientsService.search(activeSearch!),
    enabled: activeSearch !== null,
  });

  const results = useMemo(() => (searchQuery.data ?? []).map(patientSummaryToLegacyPatient), [searchQuery.data]);
  const hasTyped = mode === "name" ? Boolean(firstName.trim() || lastName.trim()) : query.trim().length > 0;
  const searched = activeSearch !== null;
  const showEmpty = searched && searchQuery.isSuccess && results.length === 0;
  const registerHref =
    mode === "name" && (firstName.trim() || lastName.trim())
      ? `/records?view=register&firstName=${encodeURIComponent(firstName.trim())}&lastName=${encodeURIComponent(lastName.trim())}`
      : "/records?view=register";

  function switchMode(next: SearchMode) {
    setMode(next);
    setQuery("");
    setDebouncedQuery("");
    setFirstName("");
    setLastName("");
  }

  return (
    <div className="space-y-4">
      <PageCard
        title="Find or register a patient"
        description="Find a patient or register someone new."
        actions={
          <Button asChild>
            <a href="/records?view=register">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Register new patient
            </a>
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === tab.id
                  ? "border border-border bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {mode === "name" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) =>
                  setQuery(mode === "id" ? formatPatientPublicIdLive(e.target.value) : e.target.value)
                }
                placeholder={
                  mode === "id"
                    ? "Example: KBTH-12345678-26"
                    : mode === "nhis"
                      ? "Example: 12345678"
                      : "Hospital number, NHIS number, name or phone"
                }
                className="pl-9 font-clinical"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {!hasTyped && (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Ask the patient for their hospital card or NHIS card — it&apos;s the fastest way to find them.
        </div>
      )}

      {searched && searchQuery.isError && (
        <ErrorState error={searchQuery.error} onRetry={() => void searchQuery.refetch()} />
      )}

      {showEmpty && (
        <EmptyState
          illustration="no-results"
          title={`No patient found for "${mode === "name" ? `${firstName} ${lastName}`.trim() : query}"`}
          description="Check the spelling or try their phone or NHIS number."
          action={{ label: "Register new patient", href: registerHref }}
        />
      )}

      {results.length > 0 && (
        <div className="space-y-2" role="list">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {results.length} patient{results.length > 1 ? "s" : ""} found
          </p>
          {results.map((patient) => (
            <PatientResultCard
              key={patient.id ?? patient.patientId}
              patient={patient}
              showBookButton={false}
              rightSlot={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/records?view=manage&patientId=${patient.id}`)}>
                    <UserRound className="mr-1.5 h-3.5 w-3.5" />
                    View details
                  </Button>
                  <Button size="sm" onClick={() => setVisitPatient(patient)}>
                    <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                    Start today&apos;s visit
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {visitPatient && (
        <StartVisitDialog
          patient={visitPatient}
          onOpenChange={(next) => !next && setVisitPatient(null)}
        />
      )}
    </div>
  );
}
