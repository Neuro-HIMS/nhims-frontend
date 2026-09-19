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
import { InlineNotice } from "@/components/common/inline-notice";
import { SaveIndicator } from "@/components/common/save-indicator";
import { UnitInput } from "@/components/common/unit-input";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { useUIStore } from "@/store/ui.store";
import { bmiCategory, flagVital, isDangerFlag, vitalRangeFor, type VitalKey } from "@/lib/vitals-ranges";
import { appointmentsService } from "@/services/appointments.service";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import type { RecordVitalsPayload, TriagePriorityCode, VitalsDto } from "@/types/clinical.types";

const PRIORITY_CARDS: Array<{ value: TriagePriorityCode; label: string; guide: string; tone: string }> = [
  { value: "EMERGENCY", label: "Emergency", guide: "Life-threatening, needs care now", tone: "emergency" },
  { value: "URGENT", label: "Urgent", guide: "Needs care soon", tone: "urgent" },
  { value: "SEMI_URGENT", label: "Semi-urgent", guide: "Can wait a short while", tone: "semi-urgent" },
  { value: "ROUTINE", label: "Routine", guide: "Not urgent", tone: "routine" },
];

type SimpleVitalKey = "temperature" | "pulse" | "respiratoryRate" | "spo2";

const VITAL_FIELDS: Array<{ key: SimpleVitalKey; label: string; unit: string }> = [
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "pulse", label: "Pulse", unit: "/min" },
  { key: "respiratoryRate", label: "Breathing rate", unit: "/min" },
  { key: "spo2", label: "SpO₂", unit: "%" },
];

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function ageInYears(birthDate: string | null, statedAgeValue: number | null, statedAgeUnit: string | null): number {
  if (birthDate) {
    const diff = Date.now() - new Date(birthDate).getTime();
    if (!Number.isNaN(diff)) return diff / (365.25 * 24 * 60 * 60 * 1000);
  }
  if (statedAgeValue != null) {
    return statedAgeUnit === "months" ? statedAgeValue / 12 : statedAgeValue;
  }
  return 30; // Unknown age — assume adult ranges rather than block the form.
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

  const age = patientQuery.data
    ? ageInYears(patientQuery.data.birthDate, patientQuery.data.statedAgeValue, patientQuery.data.statedAgeUnit)
    : 30;

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
    if (n === null) return {};
    const flag = flagVital(key, n, age);
    const range = vitalRangeFor(key, age);
    if (isDangerFlag(flag)) {
      return { danger: `Outside the safe range for this patient (${range.low ?? range.dangerLow}–${range.high ?? range.dangerHigh} ${range.unit}). Tell a doctor now.` };
    }
    if (flag === "low" || flag === "high") {
      return { warning: `Outside the usual range for this patient (${range.low}–${range.high} ${range.unit}).` };
    }
    return {};
  }

  const bmi = useMemo(() => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100;
    if (!w || !h) return null;
    return w / (h * h);
  }, [weight, height]);

  const triageMut = useMutation({
    mutationFn: () =>
      clinicalService.recordTriage(encounterId!, {
        priority: priority!,
        chiefComplaint: chiefComplaint.trim(),
        reasoning: triageNotes.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Triage saved");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

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

  const vitalsMut = useMutation({
    mutationFn: () => clinicalService.recordVitals(encounterId!, vitalsPayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const sendToDoctorMut = useMutation({
    mutationFn: async () => {
      if (priority) await triageMut.mutateAsync();
      if (hasAnyVital) await vitalsMut.mutateAsync();
      const clinician = cliniciansQuery.data?.find((c) => c.userId === clinicianId);
      if (clinician) {
        await clinicalService.assignClinician(encounterId!, { clinicianUserId: clinician.userId, clinicianName: clinician.fullName });
      }
      return clinicalService.transition(encounterId!, { to: "AT_CONSULTATION", station: "CONSULTATION" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      qc.invalidateQueries({ queryKey: queryKeys.opd.queue });
      toast.success("Vitals saved", {
        description: `${encounterQuery.data?.patientName ?? "The patient"} is now waiting for the doctor.`,
      });
      router.push("/nurse?view=visits");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const requiredVitalsPresent = numOrNull(systolic) !== null && numOrNull(diastolic) !== null && numOrNull(temperature) !== null && numOrNull(pulse) !== null;
  const missingItems: string[] = [];
  if (!priority) missingItems.push("Choose the urgency");
  if (numOrNull(systolic) === null || numOrNull(diastolic) === null) missingItems.push("Enter blood pressure");
  if (numOrNull(temperature) === null) missingItems.push("Enter temperature");
  if (numOrNull(pulse) === null) missingItems.push("Enter pulse");
  const canSendToDoctor = priority !== null && requiredVitalsPresent;

  async function handleSaveAndStay() {
    setSaveStatus("saving");
    try {
      if (priority) await triageMut.mutateAsync();
      if (hasAnyVital) await vitalsMut.mutateAsync();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/nurse?view=visits")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to today&apos;s patients
        </Button>
        <SaveIndicator />
      </div>

      <PatientBanner patientId={patientId} encounterId={encounterId} />

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Triage</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Main complaint</label>
            <Textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Fever for 3 days"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Urgency</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIORITY_CARDS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                    priority === p.value
                      ? `border-[hsl(var(--clinical-${p.tone}))] bg-[hsl(var(--clinical-${p.tone}-bg))]`
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <p className={`font-semibold ${priority === p.value ? `text-[hsl(var(--clinical-${p.tone}))]` : "text-foreground"}`}>
                    {p.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.guide}</p>
                </button>
              ))}
            </div>
          </div>

          {priority === "EMERGENCY" && (
            <InlineNotice tone="error" title="Tell a doctor now.">
              This patient needs immediate attention.
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={sendToDoctorMut.isPending}
                  onClick={() => sendToDoctorMut.mutate()}
                >
                  Send straight to doctor
                </Button>
              </div>
            </InlineNotice>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <Textarea value={triageNotes} onChange={(e) => setTriageNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" disabled={!priority || triageMut.isPending} onClick={() => triageMut.mutate()}>
              {triageMut.isPending ? "Saving…" : "Save and record vitals"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Vitals</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Blood pressure</label>
            <div className="flex items-center gap-2">
              <UnitInput value={systolic} onChange={setSystolic} className="flex-1" />
              <span className="text-muted-foreground">/</span>
              <UnitInput value={diastolic} onChange={setDiastolic} unit="mmHg" className="flex-1" />
            </div>
            {(() => {
              const sMsg = fieldMessage("systolic", systolic);
              const dMsg = fieldMessage("diastolic", diastolic);
              const msg = sMsg.danger || dMsg.danger || sMsg.warning || dMsg.warning;
              return msg ? <p className={`text-xs ${sMsg.danger || dMsg.danger ? "text-destructive" : "text-warning"}`}>{msg}</p> : null;
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
                <label className="text-sm font-medium text-foreground">{f.label}</label>
                <UnitInput
                  value={value}
                  onChange={setValue}
                  unit={f.unit}
                  warning={msg.danger ?? msg.warning}
                  hint={lastValueHint(lastValue, lastVitals?.recordedAt)}
                />
              </div>
            );
          })}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Weight</label>
            <UnitInput value={weight} onChange={setWeight} unit="kg" hint={lastValueHint(lastVitals?.weightKg, lastVitals?.recordedAt)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Height</label>
            <UnitInput value={height} onChange={setHeight} unit="cm" hint={lastValueHint(lastVitals?.heightCm, lastVitals?.recordedAt)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">BMI (auto)</label>
            <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-clinical">
              {bmi ? `${bmi.toFixed(1)} · ${bmiCategory(bmi)}` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <label className="text-sm font-medium text-foreground">Nursing observations (optional)</label>
          <Textarea value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} rows={2} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-sm space-y-1.5">
            <label className="text-sm font-medium text-foreground">Doctor (optional)</label>
            <Select value={clinicianId} onValueChange={setClinicianId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button variant="outline" disabled={sendToDoctorMut.isPending} onClick={() => void handleSaveAndStay()}>
                <Save className="mr-1.5 h-4 w-4" /> Save and stay
              </Button>
              <Button disabled={!canSendToDoctor || sendToDoctorMut.isPending} onClick={() => sendToDoctorMut.mutate()}>
                <Send className="mr-1.5 h-4 w-4" /> {sendToDoctorMut.isPending ? "Sending…" : "Send to doctor"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
