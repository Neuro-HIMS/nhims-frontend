"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { calculateBmi, formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { Visit } from "@/lib/clinical-types";
import type { ApiError } from "@/types/api.types";
import type { RecordVitalsPayload } from "@/types/clinical.types";

const EMPTY_VITALS = {
  systolic: "",
  diastolic: "",
  temperature: "",
  pulse: "",
  spo2: "",
  weight: "",
  height: "",
  respiratoryRate: "",
  notes: "",
};

interface FolderVitalsProps {
  patientId: string;
  visit: Visit | null;
  recordedBy: string;
}

export function FolderVitals({ visit }: FolderVitalsProps) {
  const qc = useQueryClient();

  const historyQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.vitals(visit.id) : ["clinical", "vitals", "idle"],
    queryFn: () => clinicalService.encounterVitals(visit!.id),
    enabled: Boolean(visit),
  });

  const recordMut = useMutation({
    mutationFn: (payload: RecordVitalsPayload) => clinicalService.recordVitals(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Vitals recorded", {
        description: "Patient is now awaiting consultation.",
      });
      setForm(EMPTY_VITALS);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not save vitals");
    },
  });

  const [form, setForm] = useState(EMPTY_VITALS);
  const bmi = calculateBmi(form.weight, form.height);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!visit) {
      toast.error("Cannot save vitals without an active visit", {
        description: "Open the patient from today's visit list to record vitals.",
      });
      return;
    }
    if (!form.systolic && !form.diastolic && !form.temperature && !form.pulse) {
      toast.error("Enter at least one vital sign before saving");
      return;
    }
    recordMut.mutate({
      systolicMmHg: numOrNull(form.systolic),
      diastolicMmHg: numOrNull(form.diastolic),
      temperatureC: numOrNull(form.temperature),
      pulseBpm: numOrNull(form.pulse),
      respiratoryRateBpm: numOrNull(form.respiratoryRate),
      spo2Pct: numOrNull(form.spo2),
      weightKg: numOrNull(form.weight),
      heightCm: numOrNull(form.height),
      notes: form.notes ?? "",
    });
  }

  const history = historyQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Record Vitals
          </CardTitle>
          <CardDescription>
            {visit
              ? `Recording for visit ${visit.visitNo} (${visit.appointmentDate}).`
              : "No active visit selected — open from today's visits list to record vitals."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DualField
              label="Blood Pressure (mmHg)"
              left={<Input value={form.systolic} onChange={(e) => update("systolic", e.target.value)} placeholder="120" className="font-clinical" />}
              right={<Input value={form.diastolic} onChange={(e) => update("diastolic", e.target.value)} placeholder="80" className="font-clinical" />}
            />
            <RecordsField label="Temperature (°C)">
              <Input value={form.temperature} onChange={(e) => update("temperature", e.target.value)} placeholder="37.0" className="font-clinical" />
            </RecordsField>
            <RecordsField label="Pulse Rate (bpm)">
              <Input value={form.pulse} onChange={(e) => update("pulse", e.target.value)} placeholder="72" className="font-clinical" />
            </RecordsField>
            <RecordsField label="SpO₂ (%)">
              <Input value={form.spo2} onChange={(e) => update("spo2", e.target.value)} placeholder="98" className="font-clinical" />
            </RecordsField>
            <RecordsField label="Respiratory Rate (br/min)">
              <Input value={form.respiratoryRate} onChange={(e) => update("respiratoryRate", e.target.value)} placeholder="16" className="font-clinical" />
            </RecordsField>
            <RecordsField label="Weight (kg)">
              <Input value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="70.0" className="font-clinical" />
            </RecordsField>
            <RecordsField label="Height (cm)">
              <Input value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="170" className="font-clinical" />
            </RecordsField>
            <RecordsField label="BMI (auto)">
              <Input value={bmi} readOnly className="font-clinical" placeholder="—" />
            </RecordsField>
          </div>

          <RecordsField label="Nursing Observations">
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Pain score, mobility, other observations…"
              rows={2}
            />
          </RecordsField>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(EMPTY_VITALS)} disabled={recordMut.isPending}>
              Reset
            </Button>
            <Button onClick={handleSave} disabled={recordMut.isPending || !visit}>
              {recordMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save Vitals
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vitals History</CardTitle>
          <CardDescription>{history.length} record{history.length === 1 ? "" : "s"} on file</CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No vitals recorded yet for this visit.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <Th>Recorded</Th>
                    <Th>BP</Th>
                    <Th>Temp</Th>
                    <Th>Pulse</Th>
                    <Th>SpO₂</Th>
                    <Th>RR</Th>
                    <Th>Wt</Th>
                    <Th>Ht</Th>
                    <Th>BMI</Th>
                    <Th>By</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((v) => (
                    <tr key={v.id}>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {v.recordedAt ? formatDateTime(v.recordedAt) : "—"}
                      </td>
                      <td className="px-3 py-2 font-clinical">
                        {v.systolicMmHg && v.diastolicMmHg ? `${v.systolicMmHg}/${v.diastolicMmHg}` : "—"}
                      </td>
                      <td className="px-3 py-2 font-clinical">{format(v.temperatureC)}</td>
                      <td className="px-3 py-2 font-clinical">{format(v.pulseBpm)}</td>
                      <td className="px-3 py-2 font-clinical">{format(v.spo2Pct)}</td>
                      <td className="px-3 py-2 font-clinical">{format(v.respiratoryRateBpm)}</td>
                      <td className="px-3 py-2 font-clinical">{format(v.weightKg)}</td>
                      <td className="px-3 py-2 font-clinical">{format(v.heightCm)}</td>
                      <td className="px-3 py-2 font-clinical">{format(v.bmi)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{v.recordedByName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function format(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function DualField({ label, left, right }: { label: string; left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        {left}
        <span className="text-muted-foreground">/</span>
        {right}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</th>;
}
