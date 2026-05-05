"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, FolderOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PATIENTS } from "@/components/records/lib/records-data";
import type { Patient, SearchMode } from "@/components/records/lib/records-types";
import { useEncountersStore } from "@/store/encounters.store";

export function NurseSearchView() {
  const router = useRouter();
  const visits = useEncountersStore((s) => s.visits);

  const [mode, setMode] = useState<SearchMode>("id");
  const [idQuery, setIdQuery] = useState("");
  const [nhisQuery, setNhisQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [searched, setSearched] = useState(false);

  const knownPatients = useMemo(() => {
    // Combine the static records directory with patients seen via visits, so the
    // nurse can look up anyone who has been booked even if not in the seed list.
    const seen = new Map<string, Patient>();
    PATIENTS.forEach((p) => seen.set(p.patientId, p));
    visits.forEach((v) => {
      if (seen.has(v.patientId)) return;
      const [firstName, ...rest] = v.patientName.split(" ");
      seen.set(v.patientId, {
        patientId: v.patientId,
        firstName,
        lastName: rest.join(" "),
        dob: v.patientDob,
        sex: v.patientSex,
        phone: v.patientPhone,
        district: "—",
        nhisCard: v.sponsor === "NHIS" ? "—" : "",
        nhisStatus: v.sponsor === "NHIS" ? "active" : "inactive",
      });
    });
    return Array.from(seen.values());
  }, [visits]);

  const results = useMemo(() => {
    if (!searched) return [];
    if (mode === "id") {
      return knownPatients.filter((p) =>
        idQuery.trim() && p.patientId.toLowerCase().includes(idQuery.trim().toLowerCase())
      );
    }
    if (mode === "nhis") {
      return knownPatients.filter((p) =>
        nhisQuery.trim() && p.nhisCard.toLowerCase().includes(nhisQuery.trim().toLowerCase())
      );
    }
    return knownPatients.filter((p) => {
      const hasAnyName = firstName.trim() || lastName.trim();
      if (!hasAnyName) return false;
      const firstMatches = !firstName.trim() || p.firstName.toLowerCase().includes(firstName.trim().toLowerCase());
      const lastMatches = !lastName.trim() || p.lastName.toLowerCase().includes(lastName.trim().toLowerCase());
      return firstMatches && lastMatches;
    });
  }, [firstName, idQuery, lastName, mode, nhisQuery, searched, knownPatients]);

  function runSearch() {
    setSearched(true);
  }

  function clearSearch() {
    setIdQuery("");
    setNhisQuery("");
    setFirstName("");
    setLastName("");
    setSearched(false);
  }

  function hasValidQuery() {
    if (mode === "id") return idQuery.trim().length > 0;
    if (mode === "nhis") return nhisQuery.trim().length > 0;
    return firstName.trim().length > 0 || lastName.trim().length > 0;
  }

  function openFolder(patient: Patient) {
    router.push(`/nurse?view=folder&patientId=${patient.patientId}`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-muted-foreground" />
            Patient Search
          </CardTitle>
          <CardDescription>
            Search any registered patient to open their folder for vitals, notes, and care continuation.
          </CardDescription>
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
                  setSearched(false);
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
                onChange={(e) => setIdQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Example: GH-2026-04821"
                className="font-clinical"
              />
              <Button onClick={runSearch} disabled={!hasValidQuery()}>
                <Search className="mr-1.5 h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={clearSearch}>Clear</Button>
            </div>
          )}

          {mode === "nhis" && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Input
                value={nhisQuery}
                onChange={(e) => setNhisQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Example: GH/12345678-01"
                className="font-clinical"
              />
              <Button onClick={runSearch} disabled={!hasValidQuery()}>
                <Search className="mr-1.5 h-4 w-4" />
                Search
              </Button>
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
                <Button onClick={runSearch} disabled={!hasValidQuery()}>
                  <Search className="mr-1.5 h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={clearSearch}>Clear</Button>
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
              <p className="font-semibold text-foreground">No matching patient found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If this is a new client, ask Records to register them first.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {results.length} patient{results.length > 1 ? "s" : ""} found
          </p>

          {results.map((patient) => {
            const recent = visits
              .filter((v) => v.patientId === patient.patientId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const last = recent[0];
            return (
              <button
                key={patient.patientId}
                type="button"
                onClick={() => openFolder(patient)}
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
                    {last && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Last visit: {last.appointmentDate} · {last.serviceName}
                      </p>
                    )}
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
                  <Button size="sm" variant="outline" className="gap-1">
                    <FolderOpen className="h-4 w-4" />
                    Open Folder
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
