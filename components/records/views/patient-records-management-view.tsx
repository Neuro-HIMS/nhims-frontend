"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOOD_GROUP_OPTIONS } from "@/components/records/lib/records-data";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { queryKeys } from "@/lib/query-keys";
import { patientsService } from "@/services/patients.service";
import type { PatientDto, PatientSummaryDto, UpdatePatientPayload } from "@/types/patients.types";

function dtoToPayload(d: PatientDto): UpdatePatientPayload {
  return {
    clientStatus: d.clientStatus || "new",
    firstName: d.firstName || "",
    middleName: d.middleName || "",
    lastName: d.lastName || "",
    dob: d.birthDate ?? "",
    dobUnknown: d.dobUnknown,
    age: d.statedAgeValue == null ? "" : String(d.statedAgeValue),
    ageUnit: d.statedAgeUnit || "years",
    sex: d.sex || "M",
    phone: d.phone || "",
    altPhone: d.altPhone || "",
    region: d.region || "",
    address: d.address || "",
    maritalStatus: d.maritalStatus || "",
    occupation: d.occupation || "",
    nhisNumber: d.nhisMemberNumber || "",
    nhisStatus: d.nhisActive ? "yes" : "no",
    nhisExpiry: d.nhisExpiryDate ?? "",
    emergencyName: d.emergencyContactName || "",
    emergencyRelation: d.emergencyContactRelation || "",
    emergencyPhone: d.emergencyContactPhone || "",
    bloodGroup: d.bloodGroup ?? "",
    knownAllergies: d.knownAllergies ?? "",
  };
}

export function PatientRecordsManagementView() {
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSummaryDto[]>([]);
  const [selected, setSelected] = useState<PatientDto | null>(null);
  const [form, setForm] = useState<UpdatePatientPayload | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);

  async function runSearch() {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    try {
      const data = term.includes(" ")
        ? await patientsService.search({
            mode: "name",
            firstName: term.split(/\s+/)[0] ?? "",
            lastName: term.split(/\s+/).slice(1).join(" "),
          })
        : await patientsService.search({ mode: "id", q: term });
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  async function selectPatient(id: string) {
    setLoadingPatient(true);
    try {
      const p = await patientsService.getById(id);
      setSelected(p);
      setForm(dtoToPayload(p));
    } finally {
      setLoadingPatient(false);
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selected || !form) throw new Error("No patient selected");
      return patientsService.update(selected.id, form);
    },
    onSuccess: (updated) => {
      setSelected(updated);
      setForm(dtoToPayload(updated));
      qc.invalidateQueries({ queryKey: queryKeys.patients.all });
      toast.success("Patient record updated");
    },
    onError: () => toast.error("Could not update patient"),
  });

  const canSave = useMemo(() => Boolean(selected && form && !saveMut.isPending), [selected, form, saveMut.isPending]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Patient records management</CardTitle>
          <CardDescription>
            Records officers can search and edit first-time registration details for existing patients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient ID or full name"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button onClick={runSearch} disabled={searching}>
              <Search className="mr-1.5 h-4 w-4" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <PatientResultCard
                  key={r.id}
                  patient={patientSummaryToLegacyPatient(r)}
                  selected={selected?.id === r.id}
                  onSelect={() => void selectPatient(r.id)}
                  showBookButton={false}
                />
              ))}
            </div>
          )}
          {loadingPatient && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading patient...
            </p>
          )}
        </CardContent>
      </Card>

      {form && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit registration record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Client status">
                <Select value={form.clientStatus} onValueChange={(v) => setForm({ ...form, clientStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="old">Old</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="First name"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Middle name"><Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} /></Field>
              <Field label="Last name"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
              <Field label="Sex">
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="DOB unknown">
                <Select value={form.dobUnknown ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, dobUnknown: v === "yes" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth"><DatePickerField value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} /></Field>
              <Field label="Age"><Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></Field>
              <Field label="Age unit">
                <Select value={form.ageUnit} onValueChange={(v) => setForm({ ...form, ageUnit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="years">Years</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Alt phone"><Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} /></Field>
              <Field label="Region"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
              <Field label="Marital status"><Input value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })} /></Field>
              <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
              <Field label="Address" className="md:col-span-3">
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
              </Field>
              <Field label="NHIS member no."><Input value={form.nhisNumber} onChange={(e) => setForm({ ...form, nhisNumber: e.target.value })} /></Field>
              <Field label="NHIS status">
                <Select value={form.nhisStatus} onValueChange={(v) => setForm({ ...form, nhisStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Active</SelectItem><SelectItem value="no">Inactive</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="NHIS expiry"><DatePickerField value={form.nhisExpiry} onChange={(v) => setForm({ ...form, nhisExpiry: v })} /></Field>
              <Field label="Blood group">
                <Select
                  value={form.bloodGroup ? form.bloodGroup.toUpperCase() : "__none__"}
                  onValueChange={(v) => setForm({ ...form, bloodGroup: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUP_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "none"} value={opt.value || "__none__"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Known allergies" className="md:col-span-3">
                <Textarea
                  value={form.knownAllergies}
                  onChange={(e) => setForm({ ...form, knownAllergies: e.target.value })}
                  rows={3}
                  className="font-clinical"
                />
              </Field>
              <Field label="Emergency contact"><Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} /></Field>
              <Field label="Emergency relation"><Input value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} /></Field>
              <Field label="Emergency phone"><Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} /></Field>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={!canSave}>
                {saveMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
