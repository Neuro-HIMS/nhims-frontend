"use client";

import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { formatClinicalDate, formatClinicalDateTime } from "@/lib/dates";
import { allergyClash, frequencyLabel, isRxWaitingToPay, rxStatus } from "@/lib/pharmacy";
import { canDispense } from "@/lib/permissions";
import { printArea } from "@/lib/print";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import { useAuthStore } from "@/store/auth.store";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { PrescriptionDto, PrescriptionLineDto } from "@/types/clinical.types";
import type { PharmacyStockLotDto } from "@/types/pharmacy-inventory.types";

const NOT_GIVEN_REASONS = ["Out of stock", "Patient declined", "Already has it at home", "Other"] as const;
const SOON_DAYS = 60;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(`${iso.slice(0, 10)}T23:59:59`).getTime() - new Date().getTime();
  return Math.floor(ms / (24 * 3600 * 1000));
}

interface LinePlan {
  lotId: string;
  quantity: string;
  notGiving: boolean;
  reason: string;
  otherReason: string;
}

const remainingOf = (l: PrescriptionLineDto) => Math.max(0, Number(l.quantity) - Number(l.dispensedQty || 0));

/** PHA-02 / PHA-03 / PHA-04 — check a prescription, give it from the right batches, and say what wasn't given. */
export function DispenseView() {
  const router = useRouter();
  const id = useSearchParams().get("prescriptionId");
  // Kept here, not in the form: the form remounts when the prescription's status changes after dispensing.
  const [done, setDone] = useState<DoneState | null>(null);
  const rxQuery = useQuery({
    queryKey: id ? queryKeys.clinical.prescription(id) : ["clinical", "prescriptions", "idle"],
    queryFn: () => clinicalService.getPrescription(id!),
    enabled: Boolean(id),
  });

  const back = (
    <Button variant="ghost" size="sm" onClick={() => router.push("/pharmacy?view=queue")}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to prescriptions waiting
    </Button>
  );

  if (!id) {
    return (
      <EmptyState
        illustration="choose-patient"
        title="No prescription open"
        description="Open a prescription from Prescriptions waiting, or find the patient."
        action={{ label: "Prescriptions waiting", href: "/pharmacy?view=queue" }}
      />
    );
  }
  if (rxQuery.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <BannerSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (rxQuery.isError && !rxQuery.data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={rxQuery.error} onRetry={() => void rxQuery.refetch()} />
      </div>
    );
  }
  const rx = rxQuery.data!;
  return (
    <div className="space-y-4">
      {back}
      {rx.patientId && <PatientBanner patientId={rx.patientId} encounterId={rx.encounterId ?? undefined} />}
      <DispenseForm key={`${rx.id}-${rx.status}-${rx.dispenses.length}`} rx={rx} done={done} setDone={setDone} />
    </div>
  );
}

type DoneState = { given: number; notGiven: Array<{ name: string; reason: string }> };

function DispenseForm({ rx, done, setDone }: { rx: PrescriptionDto; done: DoneState | null; setDone: (d: DoneState) => void }) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const mayDispense = canDispense(role);
  const openLines = rx.lines.filter((l) => l.status !== "CANCELLED" && remainingOf(l) > 0);
  const status = rxStatus(rx.status);

  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(rx.patientId ?? ""),
    queryFn: () => patientsService.getById(rx.patientId!),
    enabled: Boolean(rx.patientId),
  });
  const alertsQuery = useQuery({
    queryKey: queryKeys.clinical.alerts(rx.patientId ?? ""),
    queryFn: () => clinicalService.listAlerts(rx.patientId!),
    enabled: Boolean(rx.patientId),
  });

  const itemIds = [...new Set(openLines.map((l) => l.pharmacyInventoryItemId).filter((x): x is string => Boolean(x)))];
  const lotQueries = useQueries({
    queries: itemIds.map((itemId) => ({
      queryKey: queryKeys.pharmacyInventory.lots(itemId),
      queryFn: () => pharmacyInventoryService.listLots(itemId),
    })),
  });
  // Earliest expiry first; expired and empty batches left out (the backend refuses expired lots).
  const lotsByItem: Record<string, PharmacyStockLotDto[]> = {};
  itemIds.forEach((itemId, i) => {
    lotsByItem[itemId] = [...(lotQueries[i]?.data ?? [])]
      .filter((lot) => Number(lot.quantityOnHand) > 0 && (daysUntil(lot.expiryDate) ?? 1) >= 0)
      .sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));
  });
  const lotsLoading = lotQueries.some((q) => q.isPending);

  const [plans, setPlans] = useState<Record<string, LinePlan>>({});
  const [counselling, setCounselling] = useState("");

  const planFor = (l: PrescriptionLineDto): LinePlan => {
    const saved = plans[l.id];
    if (saved) return saved;
    const lots = l.pharmacyInventoryItemId ? lotsByItem[l.pharmacyInventoryItemId] ?? [] : [];
    const first = lots[0];
    const qty = first ? Math.min(remainingOf(l), Number(first.quantityOnHand)) : 0;
    return { lotId: first?.id ?? "", quantity: first ? String(qty) : "0", notGiving: !first && !lotsLoading, reason: first ? "" : "Out of stock", otherReason: "" };
  };
  const setPlan = (l: PrescriptionLineDto, p: Partial<LinePlan>) => setPlans((all) => ({ ...all, [l.id]: { ...planFor(l), ...p } }));

  const problems: string[] = [];
  for (const l of openLines) {
    const p = planFor(l);
    const lot = (l.pharmacyInventoryItemId ? lotsByItem[l.pharmacyInventoryItemId] ?? [] : []).find((x) => x.id === p.lotId);
    const q = Number(p.quantity);
    if (p.notGiving) {
      if (!(p.reason === "Other" ? p.otherReason.trim() : p.reason)) problems.push(`Say why ${l.drugName} isn't being given.`);
      continue;
    }
    if (!l.pharmacyInventoryItemId) problems.push(`${l.drugName} isn't linked to a stock item. Link it in Stock → Medicines list, or mark it as not given.`);
    else if (!lot) problems.push(`Choose a batch for ${l.drugName}.`);
    if (!(q > 0)) problems.push(`Enter how much ${l.drugName} to give.`);
    else if (q > remainingOf(l)) problems.push(`${l.drugName}: that's more than prescribed (${remainingOf(l)} left).`);
    else if (lot && q > Number(lot.quantityOnHand)) problems.push(`${l.drugName}: batch ${lot.batchNo || ""} only has ${Number(lot.quantityOnHand)}.`);
    if (q < remainingOf(l) && q > 0 && !(p.reason === "Other" ? p.otherReason.trim() : p.reason)) {
      problems.push(`Say why only part of ${l.drugName} is being given.`);
    }
  }
  const giving = openLines.filter((l) => !planFor(l).notGiving && Number(planFor(l).quantity) > 0);

  const dispenseMut = useMutation({
    mutationFn: async () => {
      const notGiven = openLines
        .map((l) => {
          const p = planFor(l);
          const why = p.reason === "Other" ? p.otherReason.trim() : p.reason;
          if (p.notGiving) return { name: l.drugName, reason: why };
          if (Number(p.quantity) < remainingOf(l)) return { name: `${l.drugName} (${Number(p.quantity)} of ${remainingOf(l)} given)`, reason: why };
          return null;
        })
        .filter((x): x is { name: string; reason: string } => Boolean(x));
      const notesParts = [
        counselling.trim(),
        notGiven.length ? `Not given: ${notGiven.map((n) => `${n.name} — ${n.reason.toLowerCase()}`).join("; ")}` : "",
      ].filter(Boolean);
      if (giving.length === 0) return { saved: null, notGiven };
      const saved = await clinicalService.dispensePrescription(rx.id, {
        pharmacyNotes: notesParts.join(". ") || undefined,
        lines: giving.map((l) => ({ lineId: l.id, stockLotId: planFor(l).lotId, quantity: Number(planFor(l).quantity) })),
      });
      return { saved, notGiven };
    },
    onSuccess: ({ saved, notGiven }) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      if (saved) {
        const before = new Set(rx.dispenses.map((d) => d.id));
        saved.dispenses.filter((d) => !before.has(d.id)).forEach((d) => clinicalService.openPharmacyDispenseLabelPdf(saved.id, d.id));
      }
      setDone({ given: giving.length, notGiven });
      if (giving.length) toast.success(`${giving.length} medicine${giving.length === 1 ? "" : "s"} given to ${naturalName(rx.patientName)}. Labels are printing.`);
    },
    onError: (e) => {
      const status = (e as { response?: { status?: number } }).response?.status;
      toast.error(status === 409 ? "Stock changed while you were working. Check the batches and try again." : getFriendlyError(e).message);
      qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
    },
  });

  const [confirmFinish, setConfirmFinish] = useState(false);
  // With medicines still not given the backend counts the prescription as open, so finishing needs force.
  // The prescription itself stays "Partly given" / "Ready" in the list so the rest can be given later.
  const finishMut = useMutation({
    mutationFn: (force: boolean) => clinicalService.complete(rx.encounterId!, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(`${naturalName(rx.patientName)}'s visit is finished.`);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  // After dispensing: what happened, labels, not-given list, finish the visit.
  if (done) {
    return (
      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-success" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {done.given > 0
                ? `${done.given} medicine${done.given === 1 ? "" : "s"} given to ${naturalName(rx.patientName)}`
                : `Nothing given to ${naturalName(rx.patientName)} today`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {done.given === 0
                ? "The prescription stays in Prescriptions waiting, so it can be given when stock arrives. Give the patient the list below if they'll buy the medicines elsewhere."
                : done.notGiven.length
                  ? "Some medicines weren't given. The doctor can see why on the patient's record."
                  : "Everything on the prescription was given."}
            </p>
          </div>
        </div>
        {done.notGiven.length > 0 && (
          <div data-print-area="not-given" className="space-y-2 rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-semibold text-foreground">Medicines not given — {naturalName(rx.patientName)}</p>
            <ul className="list-disc pl-5 text-sm text-foreground">
              {done.notGiven.map((n) => (
                <li key={n.name}>
                  {n.name}: {n.reason}
                </li>
              ))}
            </ul>
            <p className="hidden text-xs print:block">Prescribed by {cleanPersonName(rx.prescribedByName) || "a clinician"}. Bring this list if you buy them elsewhere.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {rx.encounterId && (
            <Button
              disabled={finishMut.isPending || finishMut.isSuccess}
              onClick={() => (done.notGiven.length > 0 ? setConfirmFinish(true) : finishMut.mutate(false))}
            >
              {finishMut.isSuccess ? "Visit finished" : finishMut.isPending ? "Finishing…" : "Finish the visit"}
            </Button>
          )}
          {done.notGiven.length > 0 && (
            <Button variant="outline" onClick={() => printArea("not-given")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print list of medicines not given
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.location.assign("/pharmacy?view=queue")}>
            Back to prescriptions waiting
          </Button>
        </div>
        <ConfirmDialog
          open={confirmFinish}
          onOpenChange={setConfirmFinish}
          title={`Finish ${naturalName(rx.patientName)}'s visit?`}
          description="Some medicines weren't given. The visit will be closed, and the prescription stays in Prescriptions waiting so the rest can be given when it's in stock."
          confirmLabel="Finish the visit"
          cancelLabel="Not yet"
          pending={finishMut.isPending}
          onConfirm={async () => {
            await finishMut.mutateAsync(true);
          }}
        />
      </section>
    );
  }

  const patient = patientQuery.data;
  const clashes = openLines
    .map((l) => ({ line: l, clash: allergyClash(l.drugName, alertsQuery.data ?? [], patient?.knownAllergies) }))
    .filter((c) => c.clash);

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Prescription</h2>
          <p className="text-xs text-muted-foreground">
            By {cleanPersonName(rx.prescribedByName) || "a clinician"}
            {rx.prescribedAt ? ` · ${formatClinicalDateTime(rx.prescribedAt)}` : ""} · Visit {rx.encounterNumber}
          </p>
          {rx.dispensaryDiagnosisSnapshot && <p className="mt-1 text-sm text-foreground">For: {rx.dispensaryDiagnosisSnapshot}</p>}
          {rx.notes && <p className="text-sm text-muted-foreground">Note from the doctor: {rx.notes}</p>}
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {clashes.map(({ line, clash }) => (
        <div key={line.id} className="alert-critical flex items-start gap-3 rounded-lg border px-4 py-3" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            <span className="font-semibold">{line.drugName} may clash with the allergy &ldquo;{clash!.allergy}&rdquo;.</span> Check with the prescriber before giving it.
          </p>
        </div>
      ))}

      {isRxWaitingToPay(rx) && (
        <InlineNotice tone="pending" title="Waiting for payment at the cashier.">
          Give the medicines once the cashier has taken payment.
        </InlineNotice>
      )}

      {openLines.length === 0 ? (
        <InlineNotice tone="success">Everything on this prescription has been given.</InlineNotice>
      ) : (
        <ul className="space-y-3">
          {openLines.map((l) => {
            const p = planFor(l);
            const lots = l.pharmacyInventoryItemId ? lotsByItem[l.pharmacyInventoryItemId] ?? [] : [];
            const lot = lots.find((x) => x.id === p.lotId);
            const expiresIn = daysUntil(lot?.expiryDate ?? null);
            const partial = !p.notGiving && Number(p.quantity) > 0 && Number(p.quantity) < remainingOf(l);
            return (
              <li key={l.id} className="space-y-3 rounded-lg border border-border bg-surface-subtle p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {l.drugName}
                      {l.strength ? ` ${l.strength}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[frequencyLabel(l.frequency), l.durationDays ? `${l.durationDays} days` : "", l.route].filter(Boolean).join(" · ")}
                    </p>
                    {l.instructions && <p className="text-xs text-muted-foreground">{l.instructions}</p>}
                  </div>
                  <p className="font-clinical text-sm text-foreground">
                    {remainingOf(l)} to give{Number(l.dispensedQty) > 0 ? ` (${Number(l.dispensedQty)} already given)` : ""}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={p.notGiving} onCheckedChange={(v) => setPlan(l, { notGiving: v === true, reason: v === true ? p.reason || "Out of stock" : p.reason })} />
                  Not giving this one
                </label>

                {!p.notGiving && (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="space-y-1.5">
                      <label htmlFor={`batch-${l.id}`} className="text-xs font-medium text-foreground">
                        Batch (earliest expiry first)
                      </label>
                      {!l.pharmacyInventoryItemId ? (
                        <p className="text-xs text-destructive">Not linked to a stock item — link it in Stock → Medicines list.</p>
                      ) : lotsLoading ? (
                        <p className="text-xs text-muted-foreground">Loading batches…</p>
                      ) : lots.length === 0 ? (
                        <p className="text-xs text-destructive">None in stock. Mark it as not given.</p>
                      ) : (
                        <Select value={p.lotId} onValueChange={(v) => setPlan(l, { lotId: v })}>
                          <SelectTrigger id={`batch-${l.id}`} className="w-full">
                            <SelectValue placeholder="Choose a batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {lots.map((x) => (
                              <SelectItem key={x.id} value={x.id}>
                                {x.batchNo || "No batch number"} · expires {x.expiryDate ? formatClinicalDate(x.expiryDate) : "—"} · {Number(x.quantityOnHand)} left
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {expiresIn != null && expiresIn <= SOON_DAYS && (
                        <StatusPill tone="warning">{`Expires in ${expiresIn} day${expiresIn === 1 ? "" : "s"}`}</StatusPill>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`qty-${l.id}`} className="text-xs font-medium text-foreground">
                        Quantity to give
                      </label>
                      <Input
                        id={`qty-${l.id}`}
                        inputMode="numeric"
                        value={p.quantity}
                        onChange={(e) => setPlan(l, { quantity: e.target.value.replace(/[^\d.]/g, "") })}
                        className="font-clinical"
                      />
                    </div>
                  </div>
                )}

                {(p.notGiving || partial) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`why-${l.id}`} className="text-xs font-medium text-foreground">
                        {p.notGiving ? "Why it isn't given" : "Why only part is given"}
                      </label>
                      <Select value={p.reason || undefined} onValueChange={(v) => setPlan(l, { reason: v })}>
                        <SelectTrigger id={`why-${l.id}`} className="w-full">
                          <SelectValue placeholder="Choose a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {NOT_GIVEN_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {p.reason === "Other" && (
                      <div className="space-y-1.5">
                        <label htmlFor={`why-other-${l.id}`} className="text-xs font-medium text-foreground">
                          Say why
                        </label>
                        <Input id={`why-other-${l.id}`} value={p.otherReason} onChange={(e) => setPlan(l, { otherReason: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {openLines.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="counselling" className="text-sm font-medium text-foreground">
            Advice given to the patient (optional)
          </label>
          <Textarea id="counselling" rows={2} value={counselling} onChange={(e) => setCounselling(e.target.value)} placeholder="e.g. Finish the full course; take with food" />
        </div>
      )}

      {problems.length > 0 && openLines.length > 0 && (
        <InlineNotice tone="warning" title="Before giving the medicines">
          <ul className="list-disc pl-4">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </InlineNotice>
      )}

      {openLines.length > 0 &&
        (mayDispense ? (
          <div className="flex justify-end border-t border-border pt-4">
            {giving.length === 0 && !lotsLoading && (
              <p className="mr-3 self-center text-xs text-muted-foreground">Nothing is being given.</p>
            )}
            <Button
              variant={giving.length === 0 ? "outline" : "default"}
              disabled={problems.length > 0 || isRxWaitingToPay(rx) || lotsLoading || dispenseMut.isPending}
              onClick={() => dispenseMut.mutate()}
            >
              {dispenseMut.isPending ? "Giving…" : giving.length === 0 ? "Continue without giving" : "Dispense and print labels"}
            </Button>
          </div>
        ) : (
          <InlineNotice tone="info">Only pharmacy staff can give medicines.</InlineNotice>
        ))}
    </section>
  );
}
