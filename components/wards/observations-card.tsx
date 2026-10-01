"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { CardSkeleton } from "@/components/common/skeletons";
import { UnitInput } from "@/components/common/unit-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFriendlyError } from "@/lib/api-errors";
import { formatClinicalDateTime } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { ageInYears, describeRange, flagVital, isDangerFlag, vitalRangeFor, type VitalKey } from "@/lib/vitals-ranges";
import { ipdService } from "@/services/ipd.service";
import { patientsService } from "@/services/patients.service";
import type { AdmissionDto } from "@/types/clinical.types";
import type { IpdTprReadingDto } from "@/types/ipd.types";

const FIELDS: { key: VitalKey; label: string; unit: string; field: keyof Pick<IpdTprReadingDto, "tempC" | "pulse" | "respRate" | "bpSys" | "bpDia"> }[] = [
  { key: "temperature", label: "Temperature", unit: "°C", field: "tempC" },
  { key: "pulse", label: "Pulse", unit: "/min", field: "pulse" },
  { key: "respiratoryRate", label: "Breathing rate", unit: "/min", field: "respRate" },
  { key: "systolic", label: "BP top", unit: "mmHg", field: "bpSys" },
  { key: "diastolic", label: "BP bottom", unit: "mmHg", field: "bpDia" },
];

function nowLocalInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** NUR-09 — temperature, pulse, breathing and blood pressure through the stay. */
export function ObservationsCard({ admission, canRecord }: { admission: AdmissionDto; canRecord: boolean }) {
  const qc = useQueryClient();
  const tprQuery = useQuery({ queryKey: queryKeys.ipd.tpr(admission.id), queryFn: () => ipdService.listTpr(admission.id) });
  const patientQuery = useQuery({ queryKey: queryKeys.patients.detail(admission.patientId ?? ""), queryFn: () => patientsService.getById(admission.patientId!), enabled: Boolean(admission.patientId) });
  const age = patientQuery.data ? ageInYears(patientQuery.data.birthDate, patientQuery.data.statedAgeValue, patientQuery.data.statedAgeUnit) : null;

  const [values, setValues] = useState<Record<string, string>>({});
  const [at, setAt] = useState(nowLocalInput());
  const [note, setNote] = useState("");

  const warnFor = (key: VitalKey, raw: string) => {
    const v = Number(raw);
    if (!raw.trim() || !Number.isFinite(v) || age === null) return {};
    const flag = flagVital(key, v, age);
    if (flag === "normal") return {};
    const text = `Outside the usual range for this patient (${describeRange(vitalRangeFor(key, age))}).`;
    return isDangerFlag(flag) ? { danger: text } : { warning: text };
  };

  const filled = FIELDS.some((f) => (values[f.field] ?? "").trim());
  const addMut = useMutation({
    mutationFn: () =>
      ipdService.addTpr(admission.id, {
        recordedAt: new Date(at).toISOString(),
        tempC: values.tempC?.trim() || undefined,
        pulse: values.pulse?.trim() || undefined,
        respRate: values.respRate?.trim() || undefined,
        bpSys: values.bpSys?.trim() || undefined,
        bpDia: values.bpDia?.trim() || undefined,
        notes: note.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.tpr(admission.id) });
      toast.success("Observations recorded.");
      setValues({});
      setNote("");
      setAt(nowLocalInput());
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  const readings = [...(tprQuery.data ?? [])].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Temperature, pulse and breathing</h2>
        <p className="text-xs text-muted-foreground">Usually every 8 hours, or as the doctor asks.</p>
      </div>

      {canRecord && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FIELDS.map((f) => (
              <div key={f.field} className="space-y-1.5">
                <Label htmlFor={`obs-${f.field}`}>{f.label}</Label>
                <UnitInput id={`obs-${f.field}`} value={values[f.field] ?? ""} onChange={(v) => setValues((all) => ({ ...all, [f.field]: v }))} unit={f.unit} {...warnFor(f.key, values[f.field] ?? "")} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="obs-at">Taken at</Label>
              <Input id="obs-at" type="datetime-local" value={at} max={nowLocalInput()} onChange={(e) => setAt(e.target.value)} className="w-56" />
            </div>
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="obs-note">Note (optional)</Label>
              <Input id="obs-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Shivering, given paracetamol" />
            </div>
            <Button variant="outline" disabled={!filled || addMut.isPending} onClick={() => addMut.mutate()}>
              {addMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Record observations
            </Button>
          </div>
        </div>
      )}

      {tprQuery.isPending ? (
        <CardSkeleton />
      ) : tprQuery.isError ? (
        <ErrorState error={tprQuery.error} onRetry={() => void tprQuery.refetch()} />
      ) : readings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No observations recorded on this stay yet.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Trend title="Temperature" unit="°C" points={readings.map((r) => ({ at: r.recordedAt, v: Number(r.tempC) }))} high={age === null ? null : vitalRangeFor("temperature", age).high ?? null} />
            <Trend title="Pulse" unit="/min" points={readings.map((r) => ({ at: r.recordedAt, v: Number(r.pulse) }))} high={age === null ? null : vitalRangeFor("pulse", age).high ?? null} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">Taken</th>
                  <th className="py-2 pr-3 text-right font-medium">Temp</th>
                  <th className="py-2 pr-3 text-right font-medium">Pulse</th>
                  <th className="py-2 pr-3 text-right font-medium">Breathing</th>
                  <th className="py-2 pr-3 text-right font-medium">BP</th>
                  <th className="py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...readings].reverse().map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-3 text-muted-foreground">{formatClinicalDateTime(r.recordedAt)}</td>
                    <td className="py-1.5 pr-3 text-right font-clinical">{r.tempC ? `${r.tempC} °C` : "—"}</td>
                    <td className="py-1.5 pr-3 text-right font-clinical">{r.pulse || "—"}</td>
                    <td className="py-1.5 pr-3 text-right font-clinical">{r.respRate || "—"}</td>
                    <td className="py-1.5 pr-3 text-right font-clinical">{r.bpSys && r.bpDia ? `${r.bpSys}/${r.bpDia}` : "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{r.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/** A small line chart of one measure over the stay, with the top of the usual range as a dashed line. */
function Trend({ title, unit, points, high }: { title: string; unit: string; points: { at: string; v: number }[]; high: number | null }) {
  const pts = points.filter((p) => Number.isFinite(p.v) && p.v > 0).slice(-12);
  if (pts.length === 0) {
    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">Not recorded yet.</p>
      </div>
    );
  }
  const W = 300;
  const H = 80;
  const vals = pts.map((p) => p.v).concat(high ?? []);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const x = (i: number) => (pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * (W - 16) + 8);
  const y = (v: number) => H - 8 - ((v - min) / (max - min || 1)) * (H - 16);
  const last = pts[pts.length - 1];
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="font-clinical text-sm text-foreground">
          {last.v} {unit}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-20 w-full" role="img" aria-label={`${title}: ${pts.map((p) => p.v).join(", ")} ${unit}`}>
        {high !== null && <line x1={0} x2={W} y1={y(high)} y2={y(high)} stroke="hsl(var(--warning))" strokeDasharray="4 4" strokeWidth={1} />}
        <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth={2} points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.v)} r={3} fill="hsl(var(--primary))" />
        ))}
      </svg>
    </div>
  );
}
