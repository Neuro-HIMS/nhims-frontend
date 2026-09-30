"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, ScanLine } from "lucide-react";

import { ErrorState } from "@/components/common/error-state";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { ImagingReport } from "@/components/clinical/imaging/imaging-report";
import { OrderImagingDialog } from "@/components/clinical/imaging/order-imaging-dialog";
import { Button } from "@/components/ui/button";
import { cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { imagingStatus, isScanWaitingToPay } from "@/lib/imaging";
import { labUrgencyLabel } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinical.service";
import { imagingService } from "@/services/imaging.service";
import type { RadiologyOrderDto } from "@/types/clinical.types";

interface ImagingOrdersCardProps {
  encounterId: string;
  patientName: string;
  payerType: string;
  canOrder: boolean;
}

/** DOC-06 / DOC-08 (imaging) — this visit's scans: request one, follow it, read the report. */
export function ImagingOrdersCard({ encounterId, patientName, payerType, canOrder }: ImagingOrdersCardProps) {
  const [ordering, setOrdering] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const ordersQuery = useQuery({
    queryKey: queryKeys.clinical.radiologyOrders(encounterId),
    queryFn: () => clinicalService.listRadiologyOrdersForEncounter(encounterId),
    refetchInterval: 30_000,
  });
  const orders = ordersQuery.data ?? [];
  const toggle = (id: string) => setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {orders.length} scan{orders.length === 1 ? "" : "s"} on this visit
        </p>
        {canOrder && (
          <Button size="sm" variant="outline" onClick={() => setOrdering(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Order a scan
          </Button>
        )}
      </div>

      {ordersQuery.isPending ? (
        <CardSkeleton />
      ) : ordersQuery.isError ? (
        <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scans requested on this visit.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <ScanRow key={o.id} order={o} open={openIds.includes(o.id)} onToggle={() => toggle(o.id)} />
          ))}
        </ul>
      )}

      <OrderImagingDialog open={ordering} onOpenChange={setOrdering} encounterId={encounterId} patientName={patientName} payerType={payerType} />
    </div>
  );
}

function ScanRow({ order: o, open, onToggle }: { order: RadiologyOrderDto; open: boolean; onToggle: () => void }) {
  const status = imagingStatus(o.status);
  const reported = o.status === "COMPLETED";
  const cancelReason = o.status === "CANCELLED" ? imagingService.cancelReasonFor(o) : null;
  return (
    <li className={cn("rounded-lg border bg-card", reported ? "border-primary-border" : "border-border")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!reported}
        aria-expanded={reported ? open : undefined}
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left disabled:cursor-default"
      >
        <ScanLine className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {o.serviceName}
            {o.studyName && o.studyName !== o.serviceName ? ` — ${o.studyName}` : ""}
          </span>
          <span className="block text-xs text-muted-foreground">
            {labUrgencyLabel(o.priority)} · requested by {cleanPersonName(o.orderedByName) || "a clinician"}
            {o.orderedAt ? ` · ${formatClinicalDateTime(o.orderedAt)}` : ""}
          </span>
        </span>
        {isScanWaitingToPay(o) && <StatusPill tone="pending">Waiting to pay</StatusPill>}
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {reported && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
      </button>
      {cancelReason && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Cancelled by imaging: {cancelReason}</p>}
      {reported && open && (
        <div className="border-t border-border px-3 py-3">
          <ImagingReport order={o} />
        </div>
      )}
    </li>
  );
}
