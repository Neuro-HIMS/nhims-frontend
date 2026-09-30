"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pill, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { PrescribeDialog } from "@/components/clinical/pharmacy/prescribe-dialog";
import { Button } from "@/components/ui/button";
import { cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { frequencyLabel, rxStatus } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

interface MedicinesCardProps {
  encounterId: string;
  patientId: string;
  patientName: string;
  payerType: string;
  canPrescribe: boolean;
  /** Inside a card that already has a title. */
  bare?: boolean;
}

/** DOC-07 — this visit's prescriptions and how far the pharmacy has got. */
export function MedicinesCard({ encounterId, patientId, patientName, payerType, canPrescribe, bare = false }: MedicinesCardProps) {
  const [open, setOpen] = useState(false);
  const rxQuery = useQuery({
    queryKey: queryKeys.clinical.prescriptions(encounterId),
    queryFn: () => clinicalService.listPrescriptionsForEncounter(encounterId),
    refetchInterval: 30_000,
  });
  const list = [...(rxQuery.data ?? [])].sort((a, b) => (b.prescribedAt ?? "").localeCompare(a.prescribedAt ?? ""));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={bare ? "text-xs text-muted-foreground" : "text-sm font-semibold text-foreground"}>
          {bare ? `${list.length} prescription${list.length === 1 ? "" : "s"} on this visit` : "Medicines"}
        </p>
        {canPrescribe && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Prescribe
          </Button>
        )}
      </div>

      {rxQuery.isPending ? (
        <CardSkeleton />
      ) : rxQuery.isError ? (
        <ErrorState error={rxQuery.error} onRetry={() => void rxQuery.refetch()} />
      ) : list.length === 0 ? (
        bare ? (
          <p className="text-sm text-muted-foreground">No medicines prescribed on this visit yet.</p>
        ) : (
          <div className="rounded-lg border border-dashed border-border">
            <EmptyState illustration="empty-list" title="No medicines yet" description="Prescriptions for this visit will show here." />
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {list.map((rx) => {
            const s = rxStatus(rx.status);
            return (
              <li key={rx.id} className="rounded-lg border border-border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                  <Pill className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                    Prescribed by {cleanPersonName(rx.prescribedByName) || "a clinician"}
                    {rx.prescribedAt ? ` · ${formatClinicalDateTime(rx.prescribedAt)}` : ""}
                  </p>
                  <StatusPill tone={s.tone}>{s.label}</StatusPill>
                </div>
                <ul className="divide-y divide-border">
                  {rx.lines.map((l) => (
                    <li key={l.id} className="px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">
                        {l.drugName}
                        {l.strength ? ` ${l.strength}` : ""}
                        <span className="ml-2 font-clinical text-xs font-normal text-muted-foreground">× {Number(l.quantity)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[frequencyLabel(l.frequency), l.durationDays ? `${l.durationDays} days` : "", l.route, l.instructions].filter(Boolean).join(" · ")}
                      </p>
                      {Number(l.dispensedQty) > 0 && Number(l.dispensedQty) < Number(l.quantity) && (
                        <p className="text-xs text-warning">
                          Only {Number(l.dispensedQty)} of {Number(l.quantity)} given
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {rx.pharmacyNotes?.trim() && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Pharmacy: {rx.pharmacyNotes}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <PrescribeDialog open={open} onOpenChange={setOpen} encounterId={encounterId} patientId={patientId} patientName={patientName} payerType={payerType} />
    </div>
  );
}
