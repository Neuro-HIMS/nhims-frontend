"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Loader2, LogOut, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type { AdmitPayload, DischargePayload } from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

interface FolderAdmissionsProps {
  patientUuid: string;
  visit: Visit | null;
}

const EMPTY_ADMIT = {
  ward: "",
  bed: "",
  reason: "",
};

/**
 * Inpatient admission view inside the patient folder. Fetches the
 * encounter's admission history (when a visit is loaded) and the
 * patient's lifetime admissions otherwise.
 */
export function FolderAdmissions({ patientUuid, visit }: FolderAdmissionsProps) {
  const qc = useQueryClient();

  const admissionsQuery = useQuery({
    queryKey: visit
      ? queryKeys.clinical.admissions(visit.id)
      : ["clinical", "admissions", "patient", patientUuid],
    queryFn: () =>
      visit
        ? clinicalService.listAdmissionsForEncounter(visit.id)
        : clinicalService.listAdmissionsForPatient(patientUuid),
    enabled: Boolean(patientUuid),
  });

  const admitMut = useMutation({
    mutationFn: (payload: AdmitPayload) => clinicalService.admit(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Patient admitted");
      setShowForm(false);
      setForm(EMPTY_ADMIT);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not admit patient");
    },
  });

  const dischargeMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DischargePayload }) =>
      clinicalService.discharge(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Patient discharged");
      setDischargeForId(null);
      setDischargeNotes("");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not discharge");
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADMIT);
  const [dischargeForId, setDischargeForId] = useState<string | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState("");

  const list = admissionsQuery.data ?? [];
  const activeAdmission = list.find((a) => a.status === "ADMITTED");

  function handleAdmit() {
    if (!visit) {
      toast.error("Open the patient via a visit before admitting");
      return;
    }
    if (!form.ward.trim()) {
      toast.error("Ward is required");
      return;
    }
    admitMut.mutate({
      ward: form.ward.trim(),
      bed: form.bed.trim() || undefined,
      reason: form.reason.trim() || undefined,
    });
  }

  function handleDischarge(id: string) {
    if (!dischargeNotes.trim()) {
      toast.error("Discharge summary is required");
      return;
    }
    dischargeMut.mutate({ id, payload: { summary: dischargeNotes.trim() } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Admissions &amp; Discharges</p>
          <p className="text-xs text-muted-foreground">
            {activeAdmission
              ? `Currently admitted to ${activeAdmission.ward}${activeAdmission.bed ? ", Bed " + activeAdmission.bed : ""}`
              : "Not currently admitted"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((s) => !s)}
          disabled={!visit || Boolean(activeAdmission) || admitMut.isPending}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Admit Patient"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Admission</CardTitle>
            <CardDescription>Patient will be marked as admitted on this visit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <RecordsField label="Ward *">
                <Input
                  value={form.ward}
                  onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  placeholder="Male Medical Ward"
                />
              </RecordsField>
              <RecordsField label="Bed">
                <Input
                  value={form.bed}
                  onChange={(e) => setForm({ ...form, bed: e.target.value })}
                  placeholder="MM-12"
                  className="font-clinical"
                />
              </RecordsField>
              <RecordsField label="Admitting Reason" className="sm:col-span-3">
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                />
              </RecordsField>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAdmit} disabled={admitMut.isPending}>
                {admitMut.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Confirm Admission
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {admissionsQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading admissions…
          </CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <BedDouble className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No admissions on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card
              key={a.id}
              className={
                a.status === "DISCHARGED"
                  ? ""
                  : "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))]/40"
              }
            >
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {a.ward}
                      {a.bed && (
                        <>
                          {" · Bed "}
                          <span className="font-clinical">{a.bed}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Admitted {a.admittedAt ? formatDateTime(a.admittedAt) : "—"} by{" "}
                      {a.admittedByName}
                    </p>
                    {a.reason && <p className="mt-1 text-sm text-foreground">{a.reason}</p>}
                  </div>
                  {a.status === "DISCHARGED" ? (
                    <span className="status-pill status-pill-inactive text-xs">
                      Discharged · {a.dischargedAt ? formatDateTime(a.dischargedAt) : ""}
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDischargeForId(a.id)}>
                      <LogOut className="mr-1.5 h-4 w-4" />
                      Discharge
                    </Button>
                  )}
                </div>
                {a.dischargeSummary && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Discharge Summary {a.dischargedByName && `· ${a.dischargedByName}`}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-foreground">{a.dischargeSummary}</p>
                  </div>
                )}
                {dischargeForId === a.id && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <Textarea
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      placeholder="Discharge summary, follow-up plan, prescriptions on discharge…"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDischargeForId(null);
                          setDischargeNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDischarge(a.id)}
                        disabled={dischargeMut.isPending}
                      >
                        {dischargeMut.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : null}
                        Confirm Discharge
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
