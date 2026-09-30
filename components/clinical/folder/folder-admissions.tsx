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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { CardSkeleton } from "@/components/common/skeletons";
import { DISCHARGE_OUTCOME_LABELS } from "@/lib/status-labels";
import { getFriendlyError } from "@/lib/api-errors";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";

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
      toast.success("Patient admitted.");
      setShowForm(false);
      setForm(EMPTY_ADMIT);
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const dischargeMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DischargePayload }) =>
      clinicalService.discharge(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Patient discharged.");
      setDischargeForId(null);
      setDischargeNotes("");
      setDischargeOutcome("");
      setDischargeIcd("");
      setDischargeMeds("");
      setDischargeFollow("");
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADMIT);
  const [dischargeForId, setDischargeForId] = useState<string | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [dischargeOutcome, setDischargeOutcome] = useState("");
  const [dischargeIcd, setDischargeIcd] = useState("");
  const [dischargeMeds, setDischargeMeds] = useState("");
  const [dischargeFollow, setDischargeFollow] = useState("");

  const list = useMemo(() => admissionsQuery.data ?? [], [admissionsQuery.data]);
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
      toast.error("Enter the ward.");
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
      toast.error("Write the discharge summary first.");
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
          <p className="text-sm font-semibold text-foreground">Admissions and discharges</p>
          <p className="text-xs text-muted-foreground">
            {activeAdmission
              ? `Currently admitted to ${activeAdmission.ward}${activeAdmission.bed ? ", Bed " + activeAdmission.bed : ""}`
              : "Not currently admitted"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          disabled={!visit || Boolean(activeAdmission) || admitMut.isPending}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Admit patient
        </Button>
      </div>

      <FormDialog
        open={showForm}
        onOpenChange={(o) => {
          setShowForm(o);
          if (!o) setForm(EMPTY_ADMIT);
        }}
        size="md"
        title="Admit this patient"
        description="The visit is marked as admitted and the ward can see the patient."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_ADMIT); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdmit} disabled={admitMut.isPending || !form.ward.trim()}>
              {admitMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Admit patient
            </Button>
          </>
        }
      >
        <FormDialogSection title="Ward and bed">
          <RecordsField label="Ward" htmlFor="admissions-ward">
            <Input id="admissions-ward" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} placeholder="e.g. Male Medical Ward" />
          </RecordsField>
          <RecordsField label="Bed (optional)" htmlFor="admissions-bed">
            <Input id="admissions-bed" value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} placeholder="e.g. MM-12" className="font-clinical" />
          </RecordsField>
        </FormDialogSection>
        <FormDialogSection title="Why" columns={1}>
          <RecordsField label="Reason for admission (optional)" htmlFor="admissions-reason-for-admission">
            <Textarea id="admissions-reason-for-admission" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
          </RecordsField>
        </FormDialogSection>
      </FormDialog>

      {admissionsQuery.isPending ? (
        <CardSkeleton />
      ) : admissionsQuery.isError ? (
        <ErrorState error={admissionsQuery.error} onRetry={() => void admissionsQuery.refetch()} />
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
            Open an admission to see why the patient was admitted and the discharge details.
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
                  <span className="status-pill status-pill-neutral text-xs">
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
                      <FolderRecordField label="Outcome" value={DISCHARGE_OUTCOME_LABELS[a.dischargeOutcome] ?? a.dischargeOutcome} />
                    ) : null}
                    {a.dischargeIcd11Codes ? (
                      <FolderRecordField label="Diagnosis codes" value={a.dischargeIcd11Codes} />
                    ) : null}
                    {a.dischargeMedicationSummary ? (
                      <FolderRecordField label="Medicines to take home" value={a.dischargeMedicationSummary} />
                    ) : null}
                    {a.followUpPlan ? <FolderRecordField label="Follow-up plan" value={a.followUpPlan} /> : null}
                  </>
                ) : null}
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}

      <FormDialog
        open={dischargeForId !== null}
        onOpenChange={(o) => {
          if (!o) (() => {
            setDischargeForId(null);
            setDischargeNotes("");
            setDischargeOutcome("");
            setDischargeIcd("");
            setDischargeMeds("");
            setDischargeFollow("");
          })();
        }}
        size="lg"
        title="Discharge patient"
        description="Write the discharge summary. The bed is freed once the nurse confirms the patient has left."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => {
            setDischargeForId(null);
            setDischargeNotes("");
            setDischargeOutcome("");
            setDischargeIcd("");
            setDischargeMeds("");
            setDischargeFollow("");
          }}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => dischargeForId && handleDischarge(dischargeForId)}
              disabled={dischargeMut.isPending || !dischargeNotes.trim()}
            >
              {dischargeMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Discharge patient
            </Button>
          </>
        }
      >
        <FormDialogSection title="Hospital stay" columns={1}>
          <RecordsField label="Discharge summary" htmlFor="admissions-discharge-summary">
            <Textarea id="admissions-discharge-summary"               value={dischargeNotes}
              onChange={(e) => setDischargeNotes(e.target.value)}
              placeholder="Course in hospital, key tests, condition when leaving…"
              rows={5}
            />
          </RecordsField>
        </FormDialogSection>
        <FormDialogSection title="Outcome and diagnoses">
          <RecordsField label="Outcome (optional)" htmlFor="admissions-outcome">
            <Select value={dischargeOutcome || "__none__"} onValueChange={(v) => setDischargeOutcome(v === "__none__" ? "" : v)}>
              <SelectTrigger id="admissions-outcome" className="w-full">
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
          </RecordsField>
          <RecordsField label="Diagnosis codes (optional)" htmlFor="admissions-diagnosis-codes">
            <Input id="admissions-diagnosis-codes" value={dischargeIcd} onChange={(e) => setDischargeIcd(e.target.value)} placeholder="e.g. 1A00, 5A11" className="font-clinical" />
          </RecordsField>
        </FormDialogSection>
        <FormDialogSection title="Going home">
          <RecordsField label="Medicines to take home (optional)" htmlFor="admissions-medicines-to-take-home">
            <Textarea id="admissions-medicines-to-take-home" value={dischargeMeds} onChange={(e) => setDischargeMeds(e.target.value)} placeholder="Medicine, dose, how long…" rows={3} />
          </RecordsField>
          <RecordsField label="Follow-up plan (optional)" htmlFor="admissions-follow-up-plan">
            <Textarea id="admissions-follow-up-plan" value={dischargeFollow} onChange={(e) => setDischargeFollow(e.target.value)} placeholder="Clinic review date, warning signs…" rows={3} />
          </RecordsField>
        </FormDialogSection>
      </FormDialog>
    </div>
  );
}
