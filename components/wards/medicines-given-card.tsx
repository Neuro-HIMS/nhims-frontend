"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllergyCheck } from "@/hooks/use-allergy-check";
import { getFriendlyError } from "@/lib/api-errors";
import { localDay } from "@/lib/billing";
import { formatClinicalDateTime, formatTime } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { ROUTES } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { HELD_REASONS, marOpen, marStatus, marView } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import { ipdService } from "@/services/ipd.service";
import type { AdmissionDto } from "@/types/clinical.types";
import type { IpdMarEntryDto } from "@/types/ipd.types";

/** "2026-10-01T08:00" (datetime-local) for now, rounded down to the hour. */
function nowLocalInput(roundToHour = false): string {
  const d = new Date();
  if (roundToHour) d.setMinutes(0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** NUR-08 — what's due, record each dose, and what was given today. */
export function MedicinesGivenCard({ admission, canRecord }: { admission: AdmissionDto; canRecord: boolean }) {
  const [planning, setPlanning] = useState(false);
  const [recording, setRecording] = useState<IpdMarEntryDto | null>(null);
  const marQuery = useQuery({ queryKey: queryKeys.ipd.mar(admission.id), queryFn: () => ipdService.listMar(admission.id), refetchInterval: 60_000 });

  // "Due now" is judged at the last refresh (every minute), not on every render.
  const now = marQuery.dataUpdatedAt;
  const today = localDay(new Date().toISOString());
  const list = marQuery.data ?? [];
  const open = list.filter(marOpen).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const done = list
    .filter((m) => !marOpen(m) && localDay(m.givenAt ?? m.scheduledFor) === today)
    .sort((a, b) => (b.givenAt ?? b.scheduledFor).localeCompare(a.givenAt ?? a.scheduledFor));

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Medicines</h2>
          <p className="text-xs text-muted-foreground">Doses due and given on the ward.</p>
        </div>
        {canRecord && (
          <Button size="sm" variant="outline" onClick={() => setPlanning(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Plan doses
          </Button>
        )}
      </div>

      {marQuery.isPending ? (
        <CardSkeleton />
      ) : marQuery.isError ? (
        <ErrorState error={marQuery.error} onRetry={() => void marQuery.refetch()} />
      ) : (
        <>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due. Plan the doses from the doctor&apos;s orders.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {open.map((m) => {
                const v = marStatus(marView(m, now));
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-28 font-clinical text-muted-foreground">{formatTime(m.scheduledFor)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{m.drugDisplay}</span>
                      <span className="text-muted-foreground">{[m.dose, m.route].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
                      {localDay(m.scheduledFor) !== today && <span className="block text-xs text-muted-foreground">{formatClinicalDateTime(m.scheduledFor)}</span>}
                    </span>
                    <StatusPill tone={v.tone}>{v.label}</StatusPill>
                    {canRecord && (
                      <Button size="sm" variant="outline" onClick={() => setRecording(m)}>
                        Record
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today</h3>
            {done.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No doses recorded today.</p>
            ) : (
              <ul className="mt-1 divide-y divide-border text-sm">
                {done.map((m) => {
                  const v = marStatus(marView(m, now));
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-3 py-1.5">
                      <span className="w-20 font-clinical text-muted-foreground">{formatTime(m.givenAt ?? m.scheduledFor)}</span>
                      <span className="min-w-0 flex-1 text-foreground">
                        {m.drugDisplay}
                        {m.dose ? ` · ${m.dose}` : ""}
                        {m.notes ? <span className="block text-xs text-muted-foreground">{m.notes}</span> : null}
                      </span>
                      <StatusPill tone={v.tone}>{v.label}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {planning && <PlanDialog admission={admission} onClose={() => setPlanning(false)} />}
      {recording && <RecordDialog admission={admission} entry={recording} onClose={() => setRecording(null)} />}
    </section>
  );
}

const REPEATS = [
  { hours: 0, label: "Once" },
  { hours: 6, label: "Every 6 hours" },
  { hours: 8, label: "Every 8 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Once a day" },
] as const;

function PlanDialog({ admission, onClose }: { admission: AdmissionDto; onClose: () => void }) {
  const qc = useQueryClient();
  const [medicine, setMedicine] = useState("");
  const [other, setOther] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState<string>(ROUTES[0]);
  const [first, setFirst] = useState(nowLocalInput(true));
  const [repeat, setRepeat] = useState<number>(8);
  const [count, setCount] = useState("3");

  // Offer what the doctor ordered on this stay: prescriptions and treatments.
  const rxQuery = useQuery({ queryKey: queryKeys.clinical.prescriptions(admission.encounterId ?? ""), queryFn: () => clinicalService.listPrescriptionsForEncounter(admission.encounterId!), enabled: Boolean(admission.encounterId) });
  const txQuery = useQuery({ queryKey: queryKeys.clinical.treatments(admission.patientId ?? ""), queryFn: () => clinicalService.listTreatments(admission.patientId!), enabled: Boolean(admission.patientId) });
  const ordered = useMemo(() => {
    const names = new Set<string>();
    for (const rx of rxQuery.data ?? []) for (const l of rx.lines) if (l.status !== "CANCELLED") names.add(l.drugName);
    for (const t of txQuery.data ?? []) if (t.encounterId === admission.encounterId && t.status === "ORDERED") names.add(t.drug);
    return [...names];
  }, [rxQuery.data, txQuery.data, admission.encounterId]);

  const name = medicine === "__other__" ? other.trim() : medicine;
  const n = repeat === 0 ? 1 : Math.min(30, Math.max(1, Number(count) || 0));
  const times = Array.from({ length: n }, (_, i) => new Date(new Date(first).getTime() + i * repeat * 3_600_000));
  const valid = Boolean(name) && !Number.isNaN(new Date(first).getTime()) && (repeat === 0 || Number(count) >= 1);

  const mut = useMutation({
    mutationFn: async () => {
      for (const t of times) await ipdService.addMar(admission.id, { scheduledFor: t.toISOString(), drugDisplay: name, dose: dose.trim() || undefined, route });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.mar(admission.id) });
      toast.success(`${n} dose${n === 1 ? "" : "s"} of ${name} planned.`);
      onClose();
    },
    onError: (e) => {
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.mar(admission.id) });
      notify.error(`Not all doses were planned. ${getFriendlyError(e).message}`);
    },
  });

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !mut.isPending && onClose()}
      size="lg"
      title="Plan doses"
      description="Add the doses the doctor ordered so they show as due on the ward."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {n > 1 ? `Plan ${n} doses` : "Plan dose"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="Medicine">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="plan-med">Medicine</Label>
          <Select value={medicine} onValueChange={setMedicine}>
            <SelectTrigger id="plan-med" className="w-full">
              <SelectValue placeholder={ordered.length ? "Choose from the doctor's orders" : "Choose"} />
            </SelectTrigger>
            <SelectContent>
              {ordered.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
              <SelectItem value="__other__">Something else</SelectItem>
            </SelectContent>
          </Select>
          {medicine === "__other__" && <Input aria-label="Medicine name" value={other} onChange={(e) => setOther(e.target.value)} placeholder="e.g. Ceftriaxone 1 g IV" />}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-dose">Dose</Label>
          <Input id="plan-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 1 g" className="font-clinical" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-route">How it&apos;s given</Label>
          <Select value={route} onValueChange={setRoute}>
            <SelectTrigger id="plan-route" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUTES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialogSection>
      <FormDialogSection title="When">
        <div className="space-y-1.5">
          <Label htmlFor="plan-first">First dose</Label>
          <Input id="plan-first" type="datetime-local" value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label id="plan-repeat-label">How often</Label>
          <RadioGroup value={String(repeat)} onValueChange={(v) => setRepeat(Number(v))} aria-labelledby="plan-repeat-label" className="grid gap-2">
            {REPEATS.map((r) => (
              <ChoiceOption key={r.hours} className="py-1.5">
                <RadioGroupItem value={String(r.hours)} /> {r.label}
              </ChoiceOption>
            ))}
          </RadioGroup>
        </div>
        {repeat > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="plan-count">Number of doses</Label>
            <Input id="plan-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} className="w-24 font-clinical" />
          </div>
        )}
        {valid && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {times
              .slice(0, 6)
              .map((t) => formatClinicalDateTime(t.toISOString()))
              .join(" · ")}
            {times.length > 6 ? ` · and ${times.length - 6} more` : ""}
          </p>
        )}
      </FormDialogSection>
    </FormDialog>
  );
}

function RecordDialog({ admission, entry, onClose }: { admission: AdmissionDto; entry: IpdMarEntryDto; onClose: () => void }) {
  const qc = useQueryClient();
  const allergy = useAllergyCheck(admission.patientId);
  const clash = allergy.clashFor(entry.drugDisplay);
  const [outcome, setOutcome] = useState<"GIVEN" | "HELD" | "MISSED">(clash?.blocking ? "HELD" : "GIVEN");
  const [at, setAt] = useState(nowLocalInput());
  const [why, setWhy] = useState("");
  const [other, setOther] = useState("");
  const [checked, setChecked] = useState(false);

  const reason = why === "Other" ? other.trim() : why;
  const blockedGive = outcome === "GIVEN" && (!allergy.ready || clash?.blocking || (clash && !checked));
  const valid = outcome === "GIVEN" ? !blockedGive && !Number.isNaN(new Date(at).getTime()) : Boolean(reason);

  const mut = useMutation({
    mutationFn: () =>
      ipdService.updateMar(entry.id, {
        status: outcome,
        givenAt: outcome === "GIVEN" ? new Date(at).toISOString() : undefined,
        notes: outcome === "GIVEN" ? (clash ? `Allergy (${clash.allergy}) checked with the doctor before giving.` : undefined) : reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.mar(admission.id) });
      toast.success(outcome === "GIVEN" ? `${entry.drugDisplay} recorded as given.` : outcome === "HELD" ? `${entry.drugDisplay} recorded as held back.` : `${entry.drugDisplay} recorded as missed.`);
      onClose();
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !mut.isPending && onClose()}
      size="md"
      title={`Record ${entry.drugDisplay}`}
      description={`${[entry.dose, entry.route].filter(Boolean).join(" · ")}${entry.dose || entry.route ? " · " : ""}due ${formatClinicalDateTime(entry.scheduledFor)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </>
      }
    >
      {allergy.failed && <p className="text-sm text-destructive">The patient&apos;s allergies couldn&apos;t be loaded, so this dose can&apos;t be recorded as given yet.</p>}
      {clash && (
        <div className="alert-critical flex items-start gap-3 rounded-lg border px-4 py-3" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Allergy: {clash.allergy}.</span>{" "}
              {clash.blocking ? "This medicine clashes with the recorded allergy. Don't give it; tell the doctor." : "This medicine may clash with the allergy. Check with the doctor before giving it."}
            </p>
            {!clash.blocking && outcome === "GIVEN" && (
              <label className="flex items-center gap-2">
                <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} /> I checked with the doctor
              </label>
            )}
          </div>
        </div>
      )}
      <FormDialogSection columns={1}>
        <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as typeof outcome)} className="grid gap-2 sm:grid-cols-3" aria-label="What happened">
          <ChoiceOption>
            <RadioGroupItem value="GIVEN" disabled={Boolean(clash?.blocking)} /> Given
          </ChoiceOption>
          <ChoiceOption>
            <RadioGroupItem value="HELD" /> Held back
          </ChoiceOption>
          <ChoiceOption>
            <RadioGroupItem value="MISSED" /> Missed
          </ChoiceOption>
        </RadioGroup>
        {outcome === "GIVEN" ? (
          <div className="space-y-1.5">
            <Label htmlFor="rec-at">Given at</Label>
            <Input id="rec-at" type="datetime-local" value={at} max={nowLocalInput()} onChange={(e) => setAt(e.target.value)} className="w-60" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label id="rec-why">Why</Label>
            <RadioGroup value={why} onValueChange={setWhy} aria-labelledby="rec-why" className="grid gap-2 sm:grid-cols-2">
              {HELD_REASONS.map((r) => (
                <ChoiceOption key={r} className="py-1.5">
                  <RadioGroupItem value={r} /> {r}
                </ChoiceOption>
              ))}
            </RadioGroup>
            {why === "Other" && <Input aria-label="Reason" value={other} onChange={(e) => setOther(e.target.value)} />}
          </div>
        )}
      </FormDialogSection>
    </FormDialog>
  );
}
