"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Patient, SearchMode } from "@/components/records/lib/records-types";
import { AppointmentBookingForm } from "@/components/appointments/appointment-booking-form";
import { HospitalPatientCard } from "@/components/records/views/hospital-patient-card";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
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

export function ClientLookupView() {
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("id");
  const [idQuery, setIdQuery] = useState("");
  const [nhisQuery, setNhisQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const searchQuery = useQuery({
    queryKey: activeSearch ? queryKeys.patients.search(toQueryKeyParams(activeSearch)) : ["patients", "search", "idle"],
    queryFn: () => patientsService.search(activeSearch!),
    enabled: activeSearch !== null,
  });

  const selectedPatientDetailQuery = useQuery({
    queryKey: selectedPatient?.id ? queryKeys.patients.detail(selectedPatient.id) : ["patients", "detail", "idle"],
    queryFn: () => patientsService.getById(selectedPatient!.id!),
    enabled: Boolean(selectedPatient?.id),
  });

  const results = useMemo(
    () => (searchQuery.data ?? []).map(patientSummaryToLegacyPatient),
    [searchQuery.data]
  );

  function runSearch() {
    setSelectedPatient(null);
    if (mode === "id") { setActiveSearch({ mode: "id", q: idQuery.trim() }); return; }
    if (mode === "nhis") { setActiveSearch({ mode: "nhis", q: nhisQuery.trim() }); return; }
    setActiveSearch({ mode: "name", firstName: firstName.trim(), lastName: lastName.trim() });
  }

  function clearSearch() {
    setIdQuery(""); setNhisQuery(""); setFirstName(""); setLastName("");
    setActiveSearch(null); setSelectedPatient(null);
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
            Search Existing Client
          </CardTitle>
          <CardDescription>
            Start every record flow from lookup to avoid duplicate registration. Results come from your facility registry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {([
              { id: "id", label: "Client ID" },
              { id: "nhis", label: "NHIS Number" },
              { id: "name", label: "Name" },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setMode(item.id); setActiveSearch(null); setSelectedPatient(null); }}
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
              <Button onClick={runSearch} disabled={!hasValidQuery()}><Search className="mr-1.5 h-4 w-4" />Search</Button>
              <Button variant="outline" onClick={clearSearch}>Clear</Button>
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
              <Button onClick={runSearch} disabled={!hasValidQuery()}><Search className="mr-1.5 h-4 w-4" />Search</Button>
              <Button variant="outline" onClick={clearSearch}>Clear</Button>
            </div>
          )}

          {mode === "name" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
              </div>
              <div className="flex gap-2">
                <Button onClick={runSearch} disabled={!hasValidQuery()}><Search className="mr-1.5 h-4 w-4" />Search</Button>
                <Button variant="outline" onClick={clearSearch}>Clear</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {searched && searchQuery.isFetching && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Searching registry…
          </CardContent>
        </Card>
      )}

      {searched && searchQuery.isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-6 text-center text-sm">
            <p className="font-medium text-destructive">Search failed</p>
            <p className="mt-1 text-muted-foreground">{errMsg ?? "Check your connection and try again."}</p>
            <Button className="mt-4" variant="outline" size="sm" onClick={() => searchQuery.refetch()}>Retry</Button>
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
              <p className="font-semibold text-foreground">No matching client found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Register as first-time patient and continue to appointment booking.
              </p>
            </div>
            <Button onClick={() => router.push("/records?view=register")}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Register First-Time Client
            </Button>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && !searchQuery.isFetching && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {results.length} client{results.length > 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {results.map((patient) => (
              <PatientResultCard
                key={patient.id ?? patient.patientId}
                patient={patient}
                selected={selectedPatient?.patientId === patient.patientId}
                onSelect={(p) => setSelectedPatient(p)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedPatient && selectedPatient.id && selectedPatientDetailQuery.data && (
        <div className="space-y-2">
          <p className="text-center text-sm font-medium text-muted-foreground">Patient card</p>
          <HospitalPatientCard patient={selectedPatientDetailQuery.data} />
        </div>
      )}

      {selectedPatient && selectedPatient.id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Book Appointment for Existing Client</CardTitle>
            <CardDescription>
              Service is sourced from the Finance catalog so the same name flows from booking → completion → billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppointmentBookingForm
              patient={selectedPatient}
              patientId={selectedPatient.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
