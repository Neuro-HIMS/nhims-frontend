"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceOption } from "@/components/ui/choice-option";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageCard } from "@/components/layouts/page-card";
import { BLOOD_GROUP_OPTIONS, GHANA_REGIONS } from "@/components/records/lib/records-data";
import { NhisCheck } from "@/components/records/nhis-check";
import { searchPatientsFreeText } from "@/components/records/lib/records-utils";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { getFriendlyError } from "@/lib/api-errors";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPatientId = searchParams.get("patientId");

  const [query, setQuery] = useState("");
  const [searchedTerm, setSearchedTerm] = useState<string | null>(null);
  const [results, setResults] = useState<PatientSummaryDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(urlPatientId);

  const patientQuery = useQuery({
    queryKey: selectedId ? queryKeys.patients.detail(selectedId) : ["patients", "detail", "idle"],
    queryFn: () => patientsService.getById(selectedId!),
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
    router.replace(`/records?view=manage&patientId=${id}`);
  }

  const patient = patientQuery.data;

  return (
    <div className="space-y-4">
      <PageCard title="Patient details" description="Find a patient to view or correct their details." />

      {!selectedId && (
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
              <EmptyState illustration="choose-patient" title="Search for a patient" description="Their details will appear here once found." />
            )}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r) => (
                  <PatientResultCard
                    key={r.id}
                    patient={patientSummaryToLegacyPatient(r)}
                    selected={selectedId === r.id}
                    onSelect={() => selectPatient(r.id)}
                    showBookButton={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedId && patientQuery.isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patient…
        </p>
      )}

      {selectedId && patientQuery.isError && (
        <ErrorState error={patientQuery.error} onRetry={() => void patientQuery.refetch()} />
      )}

      {selectedId && patient && (
        <PatientEditPanel
          key={patient.id}
          patient={patient}
          onFindDifferent={() => {
            setSelectedId(null);
            router.replace("/records?view=manage");
          }}
        />
      )}
    </div>
  );
}

function PatientEditPanel({
  patient,
  onFindDifferent,
}: {
  patient: PatientDto;
  onFindDifferent: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<UpdatePatientPayload>(() => dtoToPayload(patient));

  const missingRequired =
    !form.firstName.trim() || !form.lastName.trim() || (form.sex !== "M" && form.sex !== "F");

  const saveMut = useMutation({
    mutationFn: () => patientsService.update(patient.id, form),
    onSuccess: (updated) => {
      setForm(dtoToPayload(updated));
      qc.setQueryData(queryKeys.patients.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.patients.all });
      toast.success("Patient details updated");
    },
    onError: (error) => {
      const friendly = getFriendlyError(error, "the patient's details");
      toast.error(friendly.title, { description: friendly.message });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-base font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="patient-id mt-0.5">
            {patient.patientPublicId} · {patient.ageDisplay} · {patient.sex === "F" ? "Female" : "Male"}
          </p>
        </div>
        <Button variant="outline" onClick={onFindDifferent}>
          Find a different patient
        </Button>
      </div>

      <SectionCard title="Personal details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="First name">
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              aria-invalid={!form.firstName.trim()}
            />
            {!form.firstName.trim() && <p className="text-xs text-destructive">Enter a first name</p>}
          </Field>
          <Field label="Other names (optional)">
            <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              aria-invalid={!form.lastName.trim()}
            />
            {!form.lastName.trim() && <p className="text-xs text-destructive">Enter a last name</p>}
          </Field>
          <Field label="Sex">
            <RadioGroup value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })} className="flex gap-3">
              <ChoiceOption>
                <RadioGroupItem value="M" /> Male
              </ChoiceOption>
              <ChoiceOption>
                <RadioGroupItem value="F" /> Female
              </ChoiceOption>
            </RadioGroup>
          </Field>
          <Field label="Date of birth">
            <DatePickerField value={form.dob} disabled={form.dobUnknown} onChange={(v) => setForm({ ...form, dob: v })} />
          </Field>
          <Field label="Occupation">
            <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Contact and next of kin">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="font-clinical" />
          </Field>
          <Field label="Alternative phone">
            <Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} className="font-clinical" />
          </Field>
          <Field label="Region">
            <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {GHANA_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address" className="sm:col-span-3">
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </Field>
          <Field label="Next of kin name">
            <Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          </Field>
          <Field label="Relationship">
            <Input value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
          </Field>
          <Field label="Next of kin phone">
            <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} className="font-clinical" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="NHIS">
        <div className="max-w-md space-y-3">
          <NhisCheck
            memberNumber={form.nhisNumber}
            onMemberNumberChange={(v) => setForm({ ...form, nhisNumber: v })}
            onVerified={(result) =>
              setForm((prev) => ({
                ...prev,
                nhisStatus: result.status === "VERIFIED" ? "yes" : "no",
                nhisExpiry: result.validUntil ?? "",
              }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard title="Allergies and blood group">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Known allergies" className="sm:col-span-2">
            <Textarea
              value={form.knownAllergies}
              onChange={(e) => setForm({ ...form, knownAllergies: e.target.value })}
              rows={2}
              className="font-clinical"
              placeholder="e.g. Penicillin, or None known"
            />
          </Field>
          <Field label="Blood group">
            <Select
              value={form.bloodGroup ? form.bloodGroup.toUpperCase() : "__none__"}
              onValueChange={(v) => setForm({ ...form, bloodGroup: v === "__none__" ? "" : v })}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select blood group" /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "none"} value={opt.value || "__none__"}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || missingRequired}>
          {saveMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm text-foreground">{label}</Label>
      {children}
    </div>
  );
}
