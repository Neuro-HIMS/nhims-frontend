"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Patient, SearchMode } from "@/components/records/lib/records-types";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { formatPatientPublicIdLive } from "@/lib/patient-public-id";
import { queryKeys } from "@/lib/query-keys";
import { patientsService } from "@/services/patients.service";
import type { PatientSearchParams } from "@/types/patients.types";
import type { ApiError } from "@/types/api.types";

type ActiveSearch = PatientSearchParams;

function toQueryKeyParams(s: ActiveSearch) {
  if (s.mode === "name") {
    return { mode: s.mode, firstName: s.firstName, lastName: s.lastName };
  }
  return { mode: s.mode, q: s.q };
}

export interface PatientSearchPanelProps {
  cardTitle?: string;
  cardDescription?: string;
  actionLabel?: string;
  onSelectPatient: (patient: Patient) => void;
}

export function PatientSearchPanel({
  cardTitle = "Patient Search",
  cardDescription = "Search registered patients from your facility MPI.",
  actionLabel = "Open",
  onSelectPatient,
}: PatientSearchPanelProps) {
  const [mode, setMode] = useState<SearchMode>("id");
  const [idQuery, setIdQuery] = useState("");
  const [nhisQuery, setNhisQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);

  const searchQuery = useQuery({
    queryKey: activeSearch ? queryKeys.patients.search(toQueryKeyParams(activeSearch)) : ["patients", "search", "idle"],
    queryFn: () => patientsService.search(activeSearch!),
    enabled: activeSearch !== null,
  });

  const results = useMemo(
    () => (searchQuery.data ?? []).map(patientSummaryToLegacyPatient),
    [searchQuery.data],
  );

  function runSearch() {
    if (mode === "id") {
      setActiveSearch({ mode: "id", q: idQuery.trim() });
      return;
    }
    if (mode === "nhis") {
      setActiveSearch({ mode: "nhis", q: nhisQuery.trim() });
      return;
    }
    setActiveSearch({ mode: "name", firstName: firstName.trim(), lastName: lastName.trim() });
  }

  function clearSearch() {
    setIdQuery("");
    setNhisQuery("");
    setFirstName("");
    setLastName("");
    setActiveSearch(null);
  }

  function hasValidQuery() {
    if (mode === "id") return idQuery.trim().length > 0;
    if (mode === "nhis") return nhisQuery.trim().length > 0;
    return firstName.trim().length > 0 || lastName.trim().length > 0;
  }

  const searched = activeSearch !== null;
  const showEmpty = searched && searchQuery.isSuccess && results.length === 0 && !searchQuery.isFetching;
  const errMsg =
    searchQuery.error && typeof searchQuery.error === "object" && "response" in searchQuery.error
      ? (searchQuery.error as { response?: { data?: ApiError } }).response?.data?.message
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-muted-foreground" />
            {cardTitle}
          </CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {([
              { id: "id", label: "Patient ID" },
              { id: "nhis", label: "NHIS Number" },
              { id: "name", label: "Name" },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id);
                  setActiveSearch(null);
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === item.id
                    ? "border border-border bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "id" && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Input
                value={idQuery}
                onChange={(e) => setIdQuery(formatPatientPublicIdLive(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && hasValidQuery() && runSearch()}
                placeholder="Example: KBTH-12345678-26"
                className="font-clinical"
              />
              <Button onClick={runSearch} disabled={!hasValidQuery()}>
                <Search className="mr-1.5 h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            </div>
          )}

          {mode === "nhis" && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Input
                value={nhisQuery}
                onChange={(e) => setNhisQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && hasValidQuery() && runSearch()}
                placeholder="Example: GH/12345678-01"
                className="font-clinical"
              />
              <Button onClick={runSearch} disabled={!hasValidQuery()}>
                <Search className="mr-1.5 h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            </div>
          )}

          {mode === "name" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
              </div>
              <div className="flex gap-2">
                <Button onClick={runSearch} disabled={!hasValidQuery()}>
                  <Search className="mr-1.5 h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={clearSearch}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {searched && searchQuery.isFetching && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Searching registry…
          </CardContent>
        </Card>
      )}

      {searched && searchQuery.isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-6 text-center text-sm">
            <p className="font-medium text-destructive">Search failed</p>
            <p className="mt-1 text-muted-foreground">{errMsg ?? "Check your connection and try again."}</p>
            <Button className="mt-4" variant="outline" size="sm" onClick={() => searchQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {showEmpty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No matching patient found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If this is a new client, ask Records to register them first.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && !searchQuery.isFetching && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {results.length} patient{results.length > 1 ? "s" : ""} found
          </p>

          {results.map((patient) => {
            const rowKey = patient.id ?? patient.patientId;
            return (
              <button
                key={rowKey}
                type="button"
                onClick={() => onSelectPatient(patient)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {patient.firstName.charAt(0)}
                    {patient.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="patient-id mt-0.5">
                      {patient.patientId} · {patient.phone}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      patient.nhisStatus === "active"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }
                  >
                    NHIS {patient.nhisStatus === "active" ? "Active" : "Inactive"}
                  </Badge>
                  <Button size="sm" variant="outline" className="gap-1 shrink-0">
                    {actionLabel}
                  </Button>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
