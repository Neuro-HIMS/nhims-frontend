"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { minorToGhs } from "@/components/finance/finance-utils";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/store/auth.store";
import type { ApiError } from "@/types/api.types";
import type { DispenseLineInput, DispensePayload, PrescriptionDto } from "@/types/clinical.types";

export function DispensePanel({ rx, onClose }: { rx: PrescriptionDto; onClose: () => void }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pharmacyStaff = user?.role === "PHARMACIST" || user?.role === "PHARMACY_TECH";

  const [completeVisitOpen, setCompleteVisitOpen] = useState(false);

  const fetchEncounterContext =
    pharmacyStaff && rx.encounterId && rx.status === "DISPENSED";

  const encounterQuery = useQuery({
    queryKey: queryKeys.clinical.encounter(rx.encounterId ?? ""),
    queryFn: () => clinicalService.byId(rx.encounterId!),
    enabled: Boolean(fetchEncounterContext && rx.encounterId),
  });

  const blockersQuery = useQuery({
    queryKey: [...queryKeys.clinical.encounter(rx.encounterId ?? ""), "blockers"],
    queryFn: () => clinicalService.blockers(rx.encounterId!),
    enabled: Boolean(fetchEncounterContext && rx.encounterId),
  });

  const dispenseMut = useMutation({
    mutationFn: (payload: DispensePayload) => clinicalService.dispensePrescription(rx.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.pharmacyQueue });
      if (rx.encounterId) {
        void qc.invalidateQueries({ queryKey: queryKeys.clinical.encounter(rx.encounterId) });
      }
      toast.success("Dispensed and recorded in patient folder");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not dispense");
    },
  });

  const markReadyMut = useMutation({
    mutationFn: () => clinicalService.updatePrescriptionStatus(rx.id, "READY"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Marked ready for dispense");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not update status");
    },
  });

  const completeVisitMut = useMutation({
    mutationFn: () => clinicalService.complete(rx.encounterId!, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.pharmacyQueue });
      toast.success("Visit completed and bill closed");
      setCompleteVisitOpen(false);
      onClose();
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not complete visit");
    },
  });

  const [qty, setQty] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(rx.pharmacyNotes ?? "");
  const [dispensePayload, setDispensePayload] = useState<DispensePayload | null>(null);

  const lineSig = rx.lines.map((l) => `${l.id}:${l.quantity}:${l.dispensedQty}`).join("|");

  useEffect(() => {
    const m: Record<string, string> = {};
    rx.lines.forEach((l) => {
      m[l.id] = String(Math.max(0, Number(l.quantity) - Number(l.dispensedQty)));
    });
    setQty(m);
    setNotes(rx.pharmacyNotes ?? "");
  }, [rx.id, lineSig, rx.pharmacyNotes]);

  const allDispensable = rx.lines.every(
    (l) =>
      l.status === "READY" ||
      l.status === "PARTIALLY_DISPENSED" ||
      l.status === "DISPENSED" ||
      l.status === "CANCELLED",
  );

  function buildDispensePayload(): DispensePayload | null {
    const lines: DispenseLineInput[] = [];
    rx.lines.forEach((l) => {
      const raw = qty[l.id] ?? "0";
      const want = Number.parseFloat(raw);
      if (!Number.isFinite(want) || want <= 0) return;
      const remaining = Math.max(0, Number(l.quantity) - Number(l.dispensedQty));
      const dispenseQty = Math.min(want, remaining);
      if (dispenseQty <= 0) return;
      lines.push({ lineId: l.id, quantity: dispenseQty });
    });
    if (lines.length === 0) {
      toast.error("Enter quantity to dispense for at least one line");
      return null;
    }
    return { lines, pharmacyNotes: notes.trim() || undefined };
  }

  function armDispense() {
    const built = buildDispensePayload();
    if (!built) return;
    setDispensePayload(built);
  }

  const encounter = encounterQuery.data;
  const blockers = blockersQuery.data ?? [];
  const completionLoading = encounterQuery.isLoading || blockersQuery.isFetching || blockersQuery.isLoading;
  const canCompleteVisit =
    pharmacyStaff &&
    Boolean(rx.encounterId) &&
    rx.status === "DISPENSED" &&
    encounter?.status === "AT_PHARMACY" &&
    blockers.length === 0 &&
    !completeVisitMut.isPending &&
    !completionLoading;

  const showVisitStationHint =
    pharmacyStaff &&
    rx.encounterId &&
    rx.status === "DISPENSED" &&
    encounter &&
    encounter.status !== "AT_PHARMACY";

  const diag = (rx.dispensaryDiagnosisSnapshot ?? "").trim();
  const chief = (rx.consultationChiefComplaintSnapshot ?? "").trim();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dispensary worksheet</CardTitle>
        <CardDescription>
          {rx.encounterNumber ? `${rx.encounterNumber} · ` : ""}
          {rx.id.slice(0, 8)}… · {rx.prescribedAt ? formatDateTime(rx.prescribedAt) : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Client information (readonly)
          </p>
          <p className="mt-1 font-medium text-foreground">{rx.patientName || "Walk-in"}</p>
          <p className="patient-id">{rx.patientPublicId}</p>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Sex:</span> {rx.patientSex || "—"} ·{" "}
              <span className="font-medium text-foreground">Age:</span> {rx.patientAgeDisplay ?? "—"}
            </p>
            <p className="flex items-start gap-1">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
              Prefilled from registration and consultation snapshots — folder editing stays with clinicians.
            </p>
          </div>
        </div>

        {chief ? (
          <ReadonlyArea label="Chief complaint (consultation snapshot)" value={chief} />
        ) : null}

        <ReadonlyArea
          label="Diagnosis (principal & additional — consultation snapshot)"
          value={diag || "—"}
        />

        <DataRow label="Prescribed by" value={rx.prescribedByName} />
        <DataRow label="Prescription status" value={rx.status.replace(/_/g, " ").toLowerCase()} />

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Medicine lines
          </p>
          {rx.lines.map((l) => {
            const remaining = Math.max(0, Number(l.quantity) - Number(l.dispensedQty));
            const unitMinor = l.unitPriceMinor;
            const cur = l.currency ?? "GHS";
            const typedQtyRaw = qty[l.id] ?? "0";
            const typedQty = Number.parseFloat(typedQtyRaw);
            const previewMinor =
              unitMinor != null && Number.isFinite(typedQty) && typedQty > 0
                ? Math.round(unitMinor * typedQty)
                : null;
            const sigHint =
              l.sigSuggestedQuantity != null && l.sigSuggestedQuantity !== ""
                ? String(l.sigSuggestedQuantity)
                : null;

            return (
              <div key={l.id} className="rounded-md border border-border bg-card p-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dosage form / name (generic) / strength
                  </p>
                  <p className="font-medium text-foreground">
                    {[l.form, l.drugName, l.strength].filter(Boolean).join(" · ") || l.drugName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[l.route, l.frequency, l.durationDays ? `${l.durationDays} days` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {l.instructions ? (
                    <p className="text-xs italic text-foreground">{l.instructions}</p>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 border-t border-border pt-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Quantity prescribed (ordered total):{" "}
                      <span className="font-clinical font-medium text-foreground">{Number(l.quantity)}</span>
                    </span>
                    <span className="patient-id">
                      Dispensed so far: {Number(l.dispensedQty)} / {Number(l.quantity)}
                    </span>
                  </div>
                  {sigHint ? (
                    <p className="text-xs text-muted-foreground">
                      SIG suggested total (doses/day × duration):{" "}
                      <span className="font-clinical font-medium text-foreground">{sigHint}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">SIG suggested total: —</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Quantity to dispense now</label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      max={remaining}
                      value={qty[l.id] ?? ""}
                      onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                      className="h-8 w-28 font-clinical text-sm"
                      disabled={
                        remaining === 0 ||
                        l.status === "PENDING" ||
                        l.status === "CANCELLED" ||
                        l.status === "DISPENSED"
                      }
                    />
                    <span className="text-xs text-muted-foreground">max {remaining} remaining · {l.payerType}</span>
                  </div>
                  <div className="rounded-md bg-muted/30 px-2 py-1.5 text-xs">
                    <span className="text-muted-foreground">Estimated cost (this dispense): </span>
                    <span className="font-clinical font-semibold text-foreground">
                      {unitMinor == null
                        ? "—"
                        : previewMinor == null
                          ? `${cur} ${minorToGhs(0)} (enter qty)`
                          : `${cur} ${minorToGhs(previewMinor)}`}
                    </span>
                    {unitMinor != null ? (
                      <span className="ml-1 text-muted-foreground">
                        @ {cur} {minorToGhs(unitMinor)} / unit
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Pharmacy notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1"
            placeholder="Counselling / out-of-stock notes…"
          />
        </div>

        {pharmacyStaff && rx.encounterId && rx.status === "DISPENSED" ? (
          <div className="rounded-md border border-border bg-muted/25 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              End of visit (pharmacy)
            </p>
            {completionLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking encounter…
              </p>
            ) : null}
            {canCompleteVisit ? (
              <p className="text-xs text-muted-foreground">
                After medication pickup, complete the visit here when the patient is going home — no pending labs,
                all prescriptions dispensed or cancelled, and billing finalized per your cashier workflow.
              </p>
            ) : null}
            {showVisitStationHint ? (
              <p className="text-xs text-amber-900 dark:text-amber-200">
                This encounter is not at the pharmacy station anymore ({encounter?.status.replace(/_/g, " ").toLowerCase() ?? "unknown"}).
                If the patient returned to the clinician or was admitted, nursing or medical staff should advance or close the visit.
              </p>
            ) : null}
            {!completionLoading && blockers.length > 0 ? (
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Cannot complete yet: {blockers.join("; ")}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!canCompleteVisit}
              onClick={() => setCompleteVisitOpen(true)}
            >
              Complete outpatient visit
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button onClick={() => armDispense()} disabled={!allDispensable || dispenseMut.isPending}>
            {dispenseMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Dispense &amp; Record
          </Button>
          {rx.status === "AWAITING_PAYMENT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markReadyMut.mutate()}
              disabled={markReadyMut.isPending}
            >
              {markReadyMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-1.5 h-4 w-4" />
              )}
              Mark Ready (cashier confirmed payment)
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <ConfirmDialog
          open={completeVisitOpen}
          onOpenChange={setCompleteVisitOpen}
          title="Complete this outpatient visit?"
          description={
            "This closes the encounter and locks the bill for reporting. Only use when the patient is leaving after pharmacy — not when they may return for admission or further consultation."
          }
          confirmLabel="Complete visit"
          pending={completeVisitMut.isPending}
          onConfirm={async () => {
            await completeVisitMut.mutateAsync();
          }}
        />

        <ConfirmDialog
          open={dispensePayload !== null}
          onOpenChange={(open) => {
            if (!open) setDispensePayload(null);
          }}
          title="Record this dispense?"
          description={`Writes ${dispensePayload?.lines.length ?? 0} medication line update(s) for ${rx.patientName ?? "patient"}. This cannot be silently undone — reconcile stock if you miscount.`}
          confirmLabel="Dispense now"
          pending={dispenseMut.isPending}
          onConfirm={async () => {
            if (!dispensePayload) return;
            await dispenseMut.mutateAsync(dispensePayload);
            setDispensePayload(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ReadonlyArea({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}
