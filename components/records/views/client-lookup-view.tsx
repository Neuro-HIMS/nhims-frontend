"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, Search, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PATIENTS } from "@/components/records/lib/records-data";
import type { Patient, SearchMode } from "@/components/records/lib/records-types";
import { AppointmentBookingCard } from "@/components/records/views/appointment-booking-card";

export function ClientLookupView() {
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("id");
  const [idQuery, setIdQuery] = useState("");
  const [nhisQuery, setNhisQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const results = useMemo(() => {
    if (!searched) return [];

    if (mode === "id") {
      return PATIENTS.filter((patient) =>
        idQuery.trim() && patient.patientId.toLowerCase().includes(idQuery.trim().toLowerCase())
      );
    }

    if (mode === "nhis") {
      return PATIENTS.filter((patient) =>
        nhisQuery.trim() && patient.nhisCard.toLowerCase().includes(nhisQuery.trim().toLowerCase())
      );
    }

    return PATIENTS.filter((patient) => {
      const hasAnyName = firstName.trim() || lastName.trim();
      if (!hasAnyName) return false;

      const firstMatches =
        !firstName.trim() || patient.firstName.toLowerCase().includes(firstName.trim().toLowerCase());
      const lastMatches =
        !lastName.trim() || patient.lastName.toLowerCase().includes(lastName.trim().toLowerCase());

      return firstMatches && lastMatches;
    });
  }, [firstName, idQuery, lastName, mode, nhisQuery, searched]);

  function runSearch() {
    setSearched(true);
    setSelectedPatient(null);
  }

  function clearSearch() {
    setIdQuery("");
    setNhisQuery("");
    setFirstName("");
    setLastName("");
    setSearched(false);
    setSelectedPatient(null);
  }

  function hasValidQuery() {
    if (mode === "id") return idQuery.trim().length > 0;
    if (mode === "nhis") return nhisQuery.trim().length > 0;
    return firstName.trim().length > 0 || lastName.trim().length > 0;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-muted-foreground" />
            Search Existing Client
          </CardTitle>
          <CardDescription>
            Start every record flow from lookup to avoid duplicate registration.
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
                onClick={() => {
                  setMode(item.id);
                  setSearched(false);
                  setSelectedPatient(null);
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
                onChange={(event) => setIdQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && runSearch()}
                placeholder="Example: GH-2026-04821"
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
                onChange={(event) => setNhisQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && runSearch()}
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
                <Input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First Name"
                />
                <Input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last Name"
                />
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

      {searched && results.length === 0 && (
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
              <UserPlus className="mr-1.5 h-4 w-4" />
              Register First-Time Client
            </Button>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {results.length} client{results.length > 1 ? "s" : ""} found
          </p>

          {results.map((patient) => (
            <button
              key={patient.patientId}
              type="button"
              onClick={() => setSelectedPatient(patient)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  {patient.firstName.charAt(0)}
                  {patient.lastName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="patient-id mt-0.5">
                    {patient.patientId} - {patient.phone} - {patient.district}
                  </p>
                </div>
                <div className="shrink-0">
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
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPatient && (
        <AppointmentBookingCard
          patient={selectedPatient}
          title="Book Appointment for Existing Client"
          description="Capture visit details and route patient to the appropriate care point."
        />
      )}
    </div>
  );
}


