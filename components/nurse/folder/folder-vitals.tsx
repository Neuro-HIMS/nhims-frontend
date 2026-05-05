"use client";

import { useMemo, useState } from "react";
import { Activity, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { calculateBmi, formatDateTime } from "@/components/nurse/lib/nurse-data";
import { useEncountersStore } from "@/store/encounters.store";
import type { Visit } from "@/lib/clinical-types";

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

export function FolderVitals({ patientId, visit, recordedBy }: FolderVitalsProps) {
  const allVitals = useEncountersStore((s) => s.vitals);
  const addVitals = useEncountersStore((s) => s.addVitals);

  const [form, setForm] = useState(EMPTY_VITALS);

  const history = useMemo(
    () => allVitals.filter((v) => v.patientId === patientId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [allVitals, patientId]
  );

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
    addVitals({
      visitId: visit.id,
      patientId,
      ...form,
      bmi,
      recordedBy,
    });
    toast.success("Vitals recorded", {
      description: "Patient is now awaiting consultation.",
    });
    setForm(EMPTY_VITALS);
  }

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
            <Button variant="outline" onClick={() => setForm(EMPTY_VITALS)}>
              Reset
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-1.5 h-4 w-4" />
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
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No vitals recorded yet for this patient.</p>
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
                      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(v.recordedAt)}</td>
                      <td className="px-3 py-2 font-clinical">{v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.temperature || "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.pulse || "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.spo2 || "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.respiratoryRate || "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.weight || "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.height || "—"}</td>
                      <td className="px-3 py-2 font-clinical">{v.bmi || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{v.recordedBy}</td>
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
