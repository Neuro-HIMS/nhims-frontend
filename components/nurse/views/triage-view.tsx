"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { SaveIndicator } from "@/components/common/save-indicator";
import { FormSkeleton } from "@/components/common/skeletons";
import { UnitInput } from "@/components/common/unit-input";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { encounterStatusLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { ageInYears, bmiCategory, describeRange, flagVital, isDangerFlag, vitalRangeFor, type VitalKey } from "@/lib/vitals-ranges";
import { appointmentsService } from "@/services/appointments.service";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import type { EncounterStatus, RecordVitalsPayload, TriagePriorityCode, VitalsDto } from "@/types/clinical.types";

const PRIORITY_CARDS: Array<{ value: TriagePriorityCode; label: string; guide: string }> = [
  { value: "EMERGENCY", label: "Emergency", guide: "Life-threatening, needs care now" },
  { value: "URGENT", label: "Urgent", guide: "Needs care soon" },
  { value: "SEMI_URGENT", label: "Semi-urgent", guide: "Can wait a short while" },
  { value: "ROUTINE", label: "Routine", guide: "Not urgent" },
];

/** Static class names per urgency (Tailwind can't see classes built by string interpolation). */
const PRIORITY_SELECTED: Record<TriagePriorityCode, { card: string; label: string }> = {
  EMERGENCY: {
    card: "border-[hsl(var(--clinical-emergency))] bg-[hsl(var(--clinical-emergency-bg))]",
    label: "text-[hsl(var(--clinical-emergency))]",
  },
  URGENT: {
    card: "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))]",
    label: "text-[hsl(var(--clinical-urgent))]",
  },
  SEMI_URGENT: {
    card: "border-[hsl(var(--clinical-semi-urgent))] bg-[hsl(var(--clinical-semi-urgent-bg))]",
    label: "text-[hsl(var(--clinical-semi-urgent))]",
  },
  ROUTINE: {
    card: "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))]",
    label: "text-[hsl(var(--clinical-routine))]",
  },
};

/** Stages at which the nurse can still triage and record vitals. */
const TRIAGE_STAGES: EncounterStatus[] = ["SCHEDULED", "CHECKED_IN", "AT_VITALS"];

type SimpleVitalKey = "temperature" | "pulse" | "respiratoryRate" | "spo2";

const VITAL_FIELDS: Array<{ key: SimpleVitalKey; label: string; unit: string }> = [
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "pulse", label: "Pulse", unit: "/min" },
  { key: "respiratoryRate", label: "Breathing rate", unit: "/min" },
  { key: "spo2", label: "Oxygen level (SpO₂)", unit: "%" },
];

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function TriageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const setSaveStatus = useUIStore((s) => s.setSaveStatus);

  const encounterId = searchParams.get("encounterId");
  const patientId = searchParams.get("patientId");

  const encounterQuery = useQuery({
    queryKey: encounterId ? queryKeys.clinical.encounter(encounterId) : ["clinical", "encounter", "idle"],
    queryFn: () => clinicalService.byId(encounterId!),
    enabled: Boolean(encounterId),
  });

  const patientQuery = useQuery({
    queryKey: patientId ? queryKeys.patients.detail(patientId) : ["patients", "detail", "idle"],
    queryFn: () => patientsService.getById(patientId!),
    enabled: Boolean(patientId),
  });

  const lastVitalsQuery = useQuery({
    queryKey: patientId ? queryKeys.clinical.patientVitals(patientId) : ["clinical", "patient-vitals", "idle"],
    queryFn: () => clinicalService.patientVitals(patientId!),
    enabled: Boolean(patientId),
  });

  const cliniciansQuery = useQuery({
    queryKey: queryKeys.appointments.clinicians,
    queryFn: () => appointmentsService.clinicians(),
  });

  const [priority, setPriority] = useState<TriagePriorityCode | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [triageNotes, setTriageNotes] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [vitalsNotes, setVitalsNotes] = useState("");
  const [clinicianId, setClinicianId] = useState("__any__");

  // What was last written to the server — so saving twice (or retrying after a
  // partial failure) never creates duplicate triage/vitals records.
  const [savedTriageKey, setSavedTriageKey] = useState<string | null>(null);
  const [savedVitalsKey, setSavedVitalsKey] = useState<string | null>(null);

  const age = patientQuery.data
    ? ageInYears(patientQuery.data.birthDate, patientQuery.data.statedAgeValue, patientQuery.data.statedAgeUnit)
    : null;

  const lastVitals: VitalsDto | undefined = useMemo(() => {
    const sorted = [...(lastVitalsQuery.data ?? [])].sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""));
    return sorted[0];
  }, [lastVitalsQuery.data]);

  function lastValueHint(value: number | string | null | undefined, recordedAt: string | null | undefined): string | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const date = recordedAt ? new Date(recordedAt) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? ` on ${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}` : "";
    return `Last: ${value}${dateLabel}`;
  }

  function fieldMessage(key: VitalKey, raw: string): { warning?: string; danger?: string } {
    const n = numOrNull(raw);
    if (n === null || age === null) return {};
    const flag = flagVital(key, n, age);
    const usual = describeRange(vitalRangeFor(key, age));
    if (isDangerFlag(flag)) {
      return { danger: `Dangerous for this patient (usual ${usual}). Tell a doctor now.` };
    }
    if (flag === "low" || flag === "high") {
      return { warning: `Outside the usual range for this patient (${usual}).` };
    }
    return {};
  }

  const bmi = useMemo(() => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100;
    if (!w || !h) return null;
    return w / (h * h);
  }, [weight, height]);

  const triagePayload = priority
    ? { priority, chiefComplaint: chiefComplaint.trim(), reasoning: triageNotes.trim() }
    : null;
  const triageKey = triagePayload ? JSON.stringify(triagePayload) : null;

  const vitalsPayload: RecordVitalsPayload = {
    systolicMmHg: numOrNull(systolic),
    diastolicMmHg: numOrNull(diastolic),
    temperatureC: numOrNull(temperature),
    pulseBpm: numOrNull(pulse),
    respiratoryRateBpm: numOrNull(respiratoryRate),
    spo2Pct: numOrNull(spo2),
    weightKg: numOrNull(weight),
    heightCm: numOrNull(height),
    notes: vitalsNotes.trim(),
  };
  const hasAnyVital = Object.values(vitalsPayload).some((v) => v !== null && v !== "");
  const vitalsKey = hasAnyVital ? JSON.stringify(vitalsPayload) : null;

  const hasUnsavedTriage = triageKey !== null && triageKey !== savedTriageKey;
  const hasUnsavedVitals = vitalsKey !== null && vitalsKey !== savedVitalsKey;

  async function saveTriageIfChanged() {
    if (!triagePayload || !hasUnsavedTriage) return;
    await clinicalService.recordTriage(encounterId!, triagePayload);
    setSavedTriageKey(triageKey);
  }

  async function saveVitalsIfChanged() {
    if (!hasUnsavedVitals) return;
    await clinicalService.recordVitals(encounterId!, vitalsPayload);
    setSavedVitalsKey(vitalsKey);
  }

  const saveTriageMut = useMutation({
    mutationFn: saveTriageIfChanged,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Triage saved.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const saveAllMut = useMutation({
    mutationFn: async () => {
      setSaveStatus("saving");
      await saveTriageIfChanged();
      await saveVitalsIfChanged();
    },
    onSuccess: () => {
      setSaveStatus("saved");
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
    },
    onError: (e) => {
      setSaveStatus("error");
      toast.error(getFriendlyError(e).message);
    },
  });

  const sendToDoctorMut = useMutation({
    mutationFn: async () => {
      await saveTriageIfChanged();
      await saveVitalsIfChanged();
      const clinician = cliniciansQuery.data?.find((c) => c.userId === clinicianId);
      if (clinician) {
        await clinicalService.assignClinician(encounterId!, { clinicianUserId: clinician.userId, clinicianName: clinician.fullName });
      }
      return clinicalService.transition(encounterId!, { to: "AT_CONSULTATION", station: "CONSULTATION" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      qc.invalidateQueries({ queryKey: queryKeys.opd.queue });
      const name = encounterQuery.data?.patientName ?? "The patient";
      toast.success(hasAnyVital ? `Vitals saved. ${name} is now waiting for the doctor.` : `${name} has been sent to the doctor.`);
      router.push("/nurse?view=visits");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const busy = saveTriageMut.isPending || saveAllMut.isPending || sendToDoctorMut.isPending;

  const requiredVitalsPresent = numOrNull(systolic) !== null && numOrNull(diastolic) !== null && numOrNull(temperature) !== null && numOrNull(pulse) !== null;
  const missingItems: string[] = [];
  if (!priority) missingItems.push("Choose the urgency");
  if (numOrNull(systolic) === null || numOrNull(diastolic) === null) missingItems.push("Enter blood pressure");
  if (numOrNull(temperature) === null) missingItems.push("Enter temperature");
  if (numOrNull(pulse) === null) missingItems.push("Enter pulse");
  const canSendToDoctor = priority !== null && requiredVitalsPresent;

  if (!encounterId || !patientId) {
    return (
      <EmptyState
        illustration="choose-patient"
        title="No patient selected"
        description="Open a patient from Today's patients to triage them and record vitals."
        action={{ label: "Today's patients", href: "/nurse?view=visits" }}
      />
    );
  }

  const backButton = (
    <Button variant="ghost" size="sm" onClick={() => router.push("/nurse?view=visits")}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to today&apos;s patients
    </Button>
  );

  if (encounterQuery.isPending) {
    return (
      <div className="space-y-4">
        {backButton}
        <FormSkeleton fields={6} />
      </div>
    );
  }
  if (encounterQuery.isError) {
    return (
      <div className="space-y-4">
        {backButton}
        <ErrorState error={encounterQuery.error} onRetry={() => void encounterQuery.refetch()} />
      </div>
    );
  }

  const encounter = encounterQuery.data;
  if (!TRIAGE_STAGES.includes(encounter.status)) {
    return (
      <div className="space-y-4">
        {backButton}
        <PatientBanner patientId={patientId} encounterId={encounterId} />
        <InlineNotice tone="info" title="Triage is already done for this visit.">
          {encounter.patientName} is now at this stage: {encounterStatusLabel(encounter.status).toLowerCase()}. Open their folder to see
          what was recorded.
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`/nurse?view=folder&patientId=${patientId}&visitId=${encounterId}`)}>
              Open patient folder
            </Button>
          </div>
        </InlineNotice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {backButton}
        <SaveIndicator />
      </div>

      <PatientBanner patientId={patientId} encounterId={encounterId} />

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Triage</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="triage-complaint" className="text-sm font-medium text-foreground">Main complaint</label>
            <Textarea
              id="triage-complaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Fever for 3 days"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <p id="triage-urgency" className="text-sm font-medium text-foreground">Urgency</p>
            <div role="radiogroup" aria-labelledby="triage-urgency" className="grid gap-2 sm:grid-cols-2">
              {PRIORITY_CARDS.map((p) => {
                const selected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "rounded-lg border-2 px-4 py-3 text-left transition-colors",
                      selected ? PRIORITY_SELECTED[p.value].card : "border-border bg-card hover:bg-muted/40",
                    )}
                  >
                    <p className={cn("font-semibold", selected ? PRIORITY_SELECTED[p.value].label : "text-foreground")}>{p.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.guide}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {priority === "EMERGENCY" && (
            <InlineNotice tone="error" title="Tell a doctor now.">
              This patient needs immediate attention.
              <div className="mt-2">
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => sendToDoctorMut.mutate()}>
                  Send straight to doctor
                </Button>
              </div>
            </InlineNotice>
          )}

          <div className="space-y-1.5">
            <label htmlFor="triage-notes" className="text-sm font-medium text-foreground">Notes (optional)</label>
            <Textarea id="triage-notes" value={triageNotes} onChange={(e) => setTriageNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" disabled={!priority || !hasUnsavedTriage || busy} onClick={() => saveTriageMut.mutate()}>
              {saveTriageMut.isPending ? "Saving…" : "Save and record vitals"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Vitals</p>
        {age === null && !patientQuery.isPending && (
          <p className="mb-3 text-xs text-muted-foreground">
            This patient&apos;s age isn&apos;t recorded, so values can&apos;t be checked against a usual range.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="vital-systolic" className="text-sm font-medium text-foreground">Blood pressure</label>
            <div className="flex items-center gap-2">
              <UnitInput id="vital-systolic" value={systolic} onChange={setSystolic} className="flex-1" />
              <span className="text-muted-foreground">/</span>
              <UnitInput id="vital-diastolic" value={diastolic} onChange={setDiastolic} unit="mmHg" className="flex-1" />
            </div>
            {(() => {
              const sMsg = fieldMessage("systolic", systolic);
              const dMsg = fieldMessage("diastolic", diastolic);
              const danger = sMsg.danger || dMsg.danger;
              const msg = danger || sMsg.warning || dMsg.warning;
              return msg ? <p className={cn("text-xs", danger ? "font-medium text-destructive" : "text-warning")}>{msg}</p> : null;
            })()}
            {lastVitals && (
              <p className="text-xs text-muted-foreground">
                {lastValueHint(
                  lastVitals.systolicMmHg != null && lastVitals.diastolicMmHg != null ? `${lastVitals.systolicMmHg}/${lastVitals.diastolicMmHg}` : null,
                  lastVitals.recordedAt,
                )}
              </p>
            )}
          </div>

          {VITAL_FIELDS.map((f) => {
            const value = { temperature, pulse, respiratoryRate, spo2 }[f.key] as string;
            const setValue = { temperature: setTemperature, pulse: setPulse, respiratoryRate: setRespiratoryRate, spo2: setSpo2 }[f.key];
            const msg = fieldMessage(f.key, value);
            const lastValue = lastVitals
              ? { temperature: lastVitals.temperatureC, pulse: lastVitals.pulseBpm, respiratoryRate: lastVitals.respiratoryRateBpm, spo2: lastVitals.spo2Pct }[f.key]
              : null;
            return (
              <div key={f.key} className="space-y-1">
                <label htmlFor={`vital-${f.key}`} className="text-sm font-medium text-foreground">{f.label}</label>
                <UnitInput
                  id={`vital-${f.key}`}
                  value={value}
                  onChange={setValue}
                  unit={f.unit}
                  danger={msg.danger}
                  warning={msg.warning}
                  hint={lastValueHint(lastValue, lastVitals?.recordedAt)}
                />
              </div>
            );
          })}

          <div className="space-y-1">
            <label htmlFor="vital-weight" className="text-sm font-medium text-foreground">Weight</label>
            <UnitInput id="vital-weight" value={weight} onChange={setWeight} unit="kg" hint={lastValueHint(lastVitals?.weightKg, lastVitals?.recordedAt)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="vital-height" className="text-sm font-medium text-foreground">Height</label>
            <UnitInput id="vital-height" value={height} onChange={setHeight} unit="cm" hint={lastValueHint(lastVitals?.heightCm, lastVitals?.recordedAt)} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">BMI (worked out for you)</p>
            <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-clinical">
              {bmi ? `${bmi.toFixed(1)} · ${bmiCategory(bmi)}` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <label htmlFor="vital-notes" className="text-sm font-medium text-foreground">Nursing observations (optional)</label>
          <Textarea id="vital-notes" value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} rows={2} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-sm space-y-1.5">
            <label htmlFor="triage-doctor" className="text-sm font-medium text-foreground">Doctor (optional)</label>
            <Select value={clinicianId} onValueChange={setClinicianId}>
              <SelectTrigger id="triage-doctor"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any available doctor</SelectItem>
                {(cliniciansQuery.data ?? []).map((c) => (
                  <SelectItem key={c.userId} value={c.userId}>{c.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col items-end gap-2">
            {!canSendToDoctor && missingItems.length > 0 && (
              <p className="text-xs text-muted-foreground">Things to finish first: {missingItems.join(", ")}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy || (!hasUnsavedTriage && !hasUnsavedVitals)}
                onClick={() => saveAllMut.mutate()}
              >
                <Save className="mr-1.5 h-4 w-4" /> Save and stay
              </Button>
              <Button disabled={!canSendToDoctor || busy} onClick={() => sendToDoctorMut.mutate()}>
                <Send className="mr-1.5 h-4 w-4" /> {sendToDoctorMut.isPending ? "Sending…" : "Send to doctor"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
