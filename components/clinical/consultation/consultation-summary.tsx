"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { TriagePill } from "@/components/clinical/triage-pill";
import { formatClinicalDate, formatClinicalDateTime } from "@/lib/dates";
import { cleanPersonName } from "@/lib/display-name";
import { frequencyLabel } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { flagVital, isDangerFlag, type VitalKey } from "@/lib/vitals-ranges";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinical.service";
import type { EncounterDto, FolderViewDto, TriagePriorityCode, VitalsDto } from "@/types/clinical.types";

interface ConsultationSummaryProps {
  folder: FolderViewDto;
  /** Other visits of this patient, newest first (current visit excluded). */
  earlierVisits: EncounterDto[];
  ageYears: number | null;
  patientId: string;
}

function latest<T extends { recordedAt: string | null }>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))[0];
}

/** Left column of the consultation page (DOC-02): what the doctor needs before speaking to the patient. */
export function ConsultationSummary({ folder, earlierVisits, ageYears, patientId }: ConsultationSummaryProps) {
  const triage = latest(folder.triage);
  const vitals = latest(folder.vitals);
  const activeAlerts = folder.alerts.filter((a) => a.active);
  const medicineLines = folder.prescriptions
    .filter((p) => p.status !== "CANCELLED")
    .flatMap((p) => p.lines.map((l) => ({ key: `${p.id}-${l.id}`, line: l })));

  const lastThree = earlierVisits.slice(0, 3);
  const notesQueries = useQueries({
    queries: lastThree.map((v) => ({
      queryKey: queryKeys.clinical.consultations(v.id),
      queryFn: () => clinicalService.listConsultationNotes(v.id),
      staleTime: 5 * 60_000,
    })),
  });

  return (
    <div className="space-y-4">
      <SummaryCard title="Today">
        {triage ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <TriagePill priority={(triage.priority as TriagePriorityCode) || "PENDING"} />
              {triage.chiefComplaint && <p className="text-sm text-foreground">{triage.chiefComplaint}</p>}
            </div>
            {triage.reasoning && <p className="text-xs text-muted-foreground">Nurse&apos;s note: {triage.reasoning}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not triaged yet.</p>
        )}

        {vitals ? (
          <VitalsGrid vitals={vitals} ageYears={ageYears} />
        ) : (
          <p className="text-sm text-muted-foreground">No vitals recorded for this visit.</p>
        )}
      </SummaryCard>

      <SummaryCard title="Alerts">
        {activeAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts on record.</p>
        ) : (
          <ul className="space-y-2">
            {activeAlerts.map((a) => {
              const serious = a.category === "ALLERGY" || a.severity === "HIGH" || a.severity === "CRITICAL";
              return (
                <li key={a.id} className="space-y-0.5">
                  <StatusPill tone={serious ? "error" : "warning"} icon={AlertTriangle}>
                    {a.label}
                  </StatusPill>
                  {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </SummaryCard>

      <SummaryCard title="Medicines this visit">
        {medicineLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">None prescribed yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {medicineLines.map(({ key, line }) => (
              <li key={key}>
                <span className="font-medium text-foreground">
                  {line.drugName}
                  {line.strength ? ` ${line.strength}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {[frequencyLabel(line.frequency), line.durationDays ? `${line.durationDays} days` : ""]
                    .filter(Boolean)
                    .map((part) => ` · ${part}`)
                    .join("")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SummaryCard>

      <SummaryCard title="Earlier visits">
        {lastThree.length === 0 ? (
          <p className="text-sm text-muted-foreground">This is the patient&apos;s first visit.</p>
        ) : (
          <ol className="space-y-3">
            {lastThree.map((v, i) => {
              const notes = notesQueries[i]?.data ?? [];
              const diagnoses = notes
                .flatMap((n) => [n.principalClassification?.name, ...(n.additionalDiagnoses ?? []).map((d) => d.classificationName || d.freeText)])
                .filter((d): d is string => Boolean(d));
              const when = v.checkedInAt ?? v.scheduledFor ?? v.createdAt;
              return (
                <li key={v.id} className="border-l-2 border-border pl-3">
                  <p className="text-xs font-medium text-muted-foreground">{when ? formatClinicalDate(when) : "Date not recorded"}</p>
                  <p className="text-sm text-foreground">{v.reason || v.serviceName || "Visit"}</p>
                  <p className="text-xs text-muted-foreground">
                    {notesQueries[i]?.isPending
                      ? "Loading diagnosis…"
                      : diagnoses.length > 0
                        ? `Diagnosis: ${Array.from(new Set(diagnoses)).join(", ")}`
                        : "No diagnosis recorded"}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
        <Link
          href={`/nurse?view=folder&patientId=${patientId}&visitId=${folder.encounter.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          See full history <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </SummaryCard>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function VitalsGrid({ vitals, ageYears }: { vitals: VitalsDto; ageYears: number | null }) {
  const flag = (key: VitalKey, value: number | null) => {
    if (value === null || ageYears === null) return "normal" as const;
    const f = flagVital(key, value, ageYears);
    if (isDangerFlag(f)) return "danger" as const;
    return f === "normal" ? ("normal" as const) : ("warning" as const);
  };

  const sys = toNum(vitals.systolicMmHg);
  const dia = toNum(vitals.diastolicMmHg);
  const bpFlag = [flag("systolic", sys), flag("diastolic", dia)];
  const items: Array<{ label: string; value: string | null; tone: "normal" | "warning" | "danger" }> = [
    {
      label: "Blood pressure",
      value: sys !== null && dia !== null ? `${sys}/${dia} mmHg` : null,
      tone: bpFlag.includes("danger") ? "danger" : bpFlag.includes("warning") ? "warning" : "normal",
    },
    { label: "Temperature", value: toNum(vitals.temperatureC) !== null ? `${toNum(vitals.temperatureC)} °C` : null, tone: flag("temperature", toNum(vitals.temperatureC)) },
    { label: "Pulse", value: toNum(vitals.pulseBpm) !== null ? `${toNum(vitals.pulseBpm)} /min` : null, tone: flag("pulse", toNum(vitals.pulseBpm)) },
    { label: "Breathing rate", value: toNum(vitals.respiratoryRateBpm) !== null ? `${toNum(vitals.respiratoryRateBpm)} /min` : null, tone: flag("respiratoryRate", toNum(vitals.respiratoryRateBpm)) },
    { label: "Oxygen (SpO₂)", value: toNum(vitals.spo2Pct) !== null ? `${toNum(vitals.spo2Pct)}%` : null, tone: flag("spo2", toNum(vitals.spo2Pct)) },
    { label: "Weight", value: toNum(vitals.weightKg) !== null ? `${toNum(vitals.weightKg)} kg` : null, tone: "normal" },
  ];

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {items
          .filter((i) => i.value !== null)
          .map((i) => (
            <div key={i.label}>
              <dt className="text-xs text-muted-foreground">{i.label}</dt>
              <dd
                className={cn(
                  "flex items-center gap-1 font-clinical text-sm font-medium",
                  i.tone === "danger" ? "text-destructive" : i.tone === "warning" ? "text-warning" : "text-foreground",
                )}
              >
                {i.tone !== "normal" && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
                {i.value}
                {i.tone === "danger" && <span className="sr-only"> (dangerous)</span>}
                {i.tone === "warning" && <span className="sr-only"> (outside the usual range)</span>}
              </dd>
            </div>
          ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Taken by {cleanPersonName(vitals.recordedByName) || "a nurse"}
        {vitals.recordedAt ? ` at ${formatClinicalDateTime(vitals.recordedAt)}` : ""}
      </p>
    </div>
  );
}
