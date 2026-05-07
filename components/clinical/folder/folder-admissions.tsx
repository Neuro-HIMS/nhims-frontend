"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Loader2, LogOut, Plus, Save } from "lucide-react";

import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type { AdmitPayload, DischargePayload } from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

const DISCHARGE_OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "IMPROVED", label: "Improved" },
  { value: "STABLE", label: "Stable" },
  { value: "AMA", label: "Left against medical advice" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DECEASED", label: "Deceased" },
  { value: "OTHER", label: "Other" },
];

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
      setDischargeOutcome("");
      setDischargeIcd("");
      setDischargeMeds("");
      setDischargeFollow("");
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
  const [dischargeOutcome, setDischargeOutcome] = useState("");
  const [dischargeIcd, setDischargeIcd] = useState("");
  const [dischargeMeds, setDischargeMeds] = useState("");
  const [dischargeFollow, setDischargeFollow] = useState("");

  const list = admissionsQuery.data ?? [];
  const activeAdmission = list.find((a) => a.status === "ADMITTED");
  const sorted = useMemo(
    () => [...list].sort((a, b) => (b.admittedAt ?? "").localeCompare(a.admittedAt ?? "")),
    [list],
  );

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
    dischargeMut.mutate({
      id,
      payload: {
        summary: dischargeNotes.trim(),
        outcome: dischargeOutcome.trim() || undefined,
        icd11Codes: dischargeIcd.trim() || undefined,
        dischargeMedicationSummary: dischargeMeds.trim() || undefined,
        followUpPlan: dischargeFollow.trim() || undefined,
      },
    });
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
          <FolderRecordFeedBanner>
            Expand an admission for clinical reason, discharge summary, and to complete a discharge when applicable.
          </FolderRecordFeedBanner>
          {sorted.map((a, idx) => (
            <FolderRecordExpandableRow
              key={a.id}
              railIndex={sorted.length - idx}
              icon={BedDouble}
              eyebrow={a.status === "DISCHARGED" ? "Discharged admission" : "Active admission"}
              title={
                <span>
                  {a.ward}
                  {a.bed ? (
                    <>
                      {" "}
                      · Bed <span className="font-clinical">{a.bed}</span>
                    </>
                  ) : null}
                </span>
              }
              preview={a.reason?.trim() ? <span className="line-clamp-2">{a.reason}</span> : null}
              footerTime={a.status === "DISCHARGED" ? a.dischargedAt ?? a.admittedAt : a.admittedAt}
              cardClassName={
                a.status === "DISCHARGED"
                  ? ""
                  : "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))]/40"
              }
              badges={
                a.status === "DISCHARGED" ? (
                  <span className="status-pill status-pill-inactive text-xs">
                    Discharged{a.dischargedAt ? ` · ${formatDateTime(a.dischargedAt)}` : ""}
                  </span>
                ) : (
                  <span className="status-pill text-xs bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]">
                    Admitted
                  </span>
                )
              }
              headerActions={
                a.status !== "DISCHARGED" ? (
                  <Button size="sm" variant="outline" onClick={() => {
                    setDischargeForId(a.id);
                    setDischargeNotes("");
                    setDischargeOutcome("");
                    setDischargeIcd("");
                    setDischargeMeds("");
                    setDischargeFollow("");
                  }}>
                    <LogOut className="mr-1.5 h-4 w-4" />
                    Discharge
                  </Button>
                ) : null
              }
            >
              <div className="space-y-4">
                <FolderRecordField label="Admitting reason" value={a.reason?.trim() || null} />
                <FolderRecordField
                  label="Admitted"
                  value={
                    `${a.admittedAt ? formatDateTime(a.admittedAt) : "—"}${a.admittedByName ? ` · ${a.admittedByName}` : ""}`
                  }
                />
                {a.dischargeSummary ? (
                  <FolderRecordField
                    label="Discharge summary"
                    value={`${a.dischargedByName ? `${a.dischargedByName}\n` : ""}${a.dischargeSummary}`}
                  />
                ) : null}
                {a.status === "DISCHARGED" && (a.dischargeOutcome || a.dischargeIcd11Codes || a.dischargeMedicationSummary || a.followUpPlan) ? (
                  <>
                    {a.dischargeOutcome ? (
                      <FolderRecordField label="Discharge outcome" value={a.dischargeOutcome} />
                    ) : null}
                    {a.dischargeIcd11Codes ? (
                      <FolderRecordField label="ICD-11 (discharge)" value={a.dischargeIcd11Codes} />
                    ) : null}
                    {a.dischargeMedicationSummary ? (
                      <FolderRecordField label="Medications on discharge" value={a.dischargeMedicationSummary} />
                    ) : null}
                    {a.followUpPlan ? <FolderRecordField label="Follow-up plan" value={a.followUpPlan} /> : null}
                  </>
                ) : null}
                {dischargeForId === a.id && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Complete discharge
                    </p>
                    <Textarea
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      placeholder="Discharge summary — course in hospital, condition at discharge…"
                      rows={3}
                    />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Outcome</Label>
                      <Select
                        value={dischargeOutcome || "__none__"}
                        onValueChange={(v) => setDischargeOutcome(v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCHARGE_OUTCOME_OPTIONS.map((o) => (
                            <SelectItem key={o.value || "none"} value={o.value || "__none__"}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={dischargeIcd}
                      onChange={(e) => setDischargeIcd(e.target.value)}
                      placeholder="ICD-11 codes (comma-separated)"
                      className="font-clinical"
                    />
                    <Textarea
                      value={dischargeMeds}
                      onChange={(e) => setDischargeMeds(e.target.value)}
                      placeholder="Medications on discharge"
                      rows={2}
                    />
                    <Textarea
                      value={dischargeFollow}
                      onChange={(e) => setDischargeFollow(e.target.value)}
                      placeholder="Follow-up plan"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDischargeForId(null);
                          setDischargeNotes("");
                          setDischargeOutcome("");
                          setDischargeIcd("");
                          setDischargeMeds("");
                          setDischargeFollow("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleDischarge(a.id)} disabled={dischargeMut.isPending}>
                        {dischargeMut.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : null}
                        Confirm discharge
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}
    </div>
  );
}
