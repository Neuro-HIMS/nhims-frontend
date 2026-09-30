"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FlaskConical, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { LabResultsTable } from "@/components/clinical/lab/lab-results-table";
import { OrderLabDialog } from "@/components/clinical/lab/order-lab-dialog";
import { LabMalariaPanelReadonly, parseMalariaPanelJson } from "@/components/laboratory/lab-malaria-panel-form";
import { Button } from "@/components/ui/button";
import { cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { isWaitingToPay, labStatus, labUrgencyLabel } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinical.service";
import { labService } from "@/services/lab.service";
import type { LabOrderDto } from "@/types/clinical.types";

interface LabOrdersCardProps {
  encounterId: string;
  patientName: string;
  payerType: string;
  canOrder: boolean;
  /** Inside a card that already has a title (consultation "Tests" card): no own heading. */
  bare?: boolean;
}

/** DOC-05 / DOC-08 — this visit's lab tests: request more, follow their status, read results. */
export function LabOrdersCard({ encounterId, patientName, payerType, canOrder, bare = false }: LabOrdersCardProps) {
  const [ordering, setOrdering] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);

  const ordersQuery = useQuery({
    queryKey: queryKeys.clinical.labOrders(encounterId),
    queryFn: () => clinicalService.listLabOrdersForEncounter(encounterId),
    refetchInterval: 30_000,
  });

  const orders = ordersQuery.data ?? [];
  const openRequested = orders.filter((o) => !["AUTHORISED", "CANCELLED"].includes(o.status)).map((o) => o.serviceId ?? "");

  const toggle = (id: string) => setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!bare ? (
          <div>
            <p className="text-sm font-semibold text-foreground">Lab tests</p>
            <p className="text-xs text-muted-foreground">
              {orders.length} test{orders.length === 1 ? "" : "s"} on this visit
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {orders.length} lab test{orders.length === 1 ? "" : "s"} on this visit
          </p>
        )}
        {canOrder && (
          <Button size="sm" variant="outline" onClick={() => setOrdering(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Order lab tests
          </Button>
        )}
      </div>

      {ordersQuery.isPending ? (
        <CardSkeleton />
      ) : ordersQuery.isError ? (
        <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
      ) : orders.length === 0 && bare ? (
        <p className="text-sm text-muted-foreground">No lab tests on this visit yet.</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border">
          <EmptyState
            illustration="empty-list"
            title="No lab tests yet"
            description={canOrder ? "Tests you order for this visit will show here with their results." : "No tests were requested on this visit."}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <LabOrderRow key={o.id} order={o} open={openIds.includes(o.id)} onToggle={() => toggle(o.id)} />
          ))}
        </ul>
      )}

      <OrderLabDialog
        open={ordering}
        onOpenChange={setOrdering}
        encounterId={encounterId}
        patientName={patientName}
        payerType={payerType}
        alreadyRequested={openRequested}
      />
    </div>
  );
}

function LabOrderRow({ order: o, open, onToggle }: { order: LabOrderDto; open: boolean; onToggle: () => void }) {
  const status = labStatus(o.status);
  const hasResults = o.status === "COMPLETED" || o.status === "AUTHORISED";
  const rejection = o.status === "CANCELLED" ? labService.rejectionFor(o.id) : null;
  const malaria = o.malariaPanelJson ? parseMalariaPanelJson(o.malariaPanelJson) : null;

  return (
    <li className={cn("rounded-lg border bg-card", hasResults ? "border-primary-border" : "border-border")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasResults}
        aria-expanded={hasResults ? open : undefined}
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left disabled:cursor-default"
      >
        <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{o.serviceName}</span>
          <span className="block text-xs text-muted-foreground">
            {labUrgencyLabel(o.priority)} · requested by {cleanPersonName(o.orderedByName) || "a clinician"}
            {o.orderedAt ? ` · ${formatClinicalDateTime(o.orderedAt)}` : ""}
          </span>
        </span>
        {isWaitingToPay(o) && <StatusPill tone="pending">Waiting to pay</StatusPill>}
        <StatusPill tone={rejection ? "error" : status.tone}>{rejection ? "Sample rejected" : status.label}</StatusPill>
        {hasResults &&
          (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
      </button>
      {rejection && (
        <p className="border-t border-border px-3 py-2 text-xs text-destructive">
          The lab rejected the sample: {rejection.reason.toLowerCase()}. Request the test again for a new sample.
        </p>
      )}
      {hasResults && open && (
        <div className="space-y-2 border-t border-border px-3 py-3">
          {o.status === "COMPLETED" && (
            <p className="text-xs text-muted-foreground">Entered by the lab — waiting for a lab scientist to authorise.</p>
          )}
          {malaria && <LabMalariaPanelReadonly value={malaria} />}
          {(o.results.length > 0 || !malaria) && <LabResultsTable rows={o.results} />}
        </div>
      )}
    </li>
  );
}
