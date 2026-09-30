"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/common/status-pill";
import { WaitingList } from "@/components/clinical/waiting-list";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { isSelfPay } from "@/lib/lab-results";
import { isRxWaitingToPay, rxStatus } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";

const REFRESH_MS = 30_000;

/** PHA-01 — prescriptions waiting at the pharmacy, oldest first; unpaid ones wait for the cashier. */
export function PharmacyQueueView() {
  const router = useRouter();
  const queueQuery = useQuery({
    queryKey: queryKeys.clinical.pharmacyQueue,
    queryFn: () => clinicalService.pharmacyWorklist(),
    refetchInterval: REFRESH_MS,
  });
  const stockQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.overview("true"),
    queryFn: () => pharmacyInventoryService.stockOverview(true),
    refetchInterval: 5 * 60_000,
  });

  const rows = (queueQuery.data ?? []).filter((r) => r.status !== "DISPENSED" && r.status !== "CANCELLED");
  const lowStock = (stockQuery.data ?? []).filter((s) => s.stockStatus === "LOW" || s.stockStatus === "OUT").length;
  const stats = {
    ready: rows.filter((r) => r.status === "READY").length,
    waitingToPay: rows.filter((r) => isRxWaitingToPay(r)).length,
    partly: rows.filter((r) => r.status === "PARTIALLY_DISPENSED").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ready to collect" value={stats.ready} />
        <Stat label="Waiting to pay" value={stats.waitingToPay} />
        <Stat label="Partly given" value={stats.partly} />
        <Link href="/pharmacy?view=inventory&tab=stock" className="rounded-xl border border-border bg-card px-4 py-3 hover:border-primary-border">
          <p className="stat-card-label">Low or out of stock</p>
          <p className="stat-card-value">{stockQuery.isPending || stockQuery.isError ? "—" : lowStock}</p>
        </Link>
      </div>
      <WaitingList
        items={queueQuery.isPending ? undefined : rows}
        isLoading={queueQuery.isPending}
        error={queueQuery.isError ? queueQuery.error : undefined}
        onRetry={() => void queueQuery.refetch()}
        getRowId={(r) => r.id}
        getPatient={(r) => ({ name: naturalName(r.patientName), hospitalNumber: r.patientPublicId })}
        getArrivedAt={(r) => r.prescribedAt ?? new Date().toISOString()}
        getWhat={(r) => (
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              {r.lines.length} medicine{r.lines.length === 1 ? "" : "s"}
              <span className="text-muted-foreground"> — {r.lines.slice(0, 3).map((l) => l.drugName).join(", ")}{r.lines.length > 3 ? "…" : ""}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {r.lines.some((l) => l.payerType === "NHIS") ? (
                <StatusPill tone="info">NHIS</StatusPill>
              ) : isSelfPay(r.lines[0]?.payerType) ? (
                <StatusPill tone="neutral">Self-pay</StatusPill>
              ) : null}
              <span className="text-xs text-muted-foreground">by {cleanPersonName(r.prescribedByName) || "a clinician"}</span>
            </div>
          </div>
        )}
        getStatus={(r) => rxStatus(r.status)}
        primaryActionLabel="Dispense"
        getActionDisabledReason={(r) => (isRxWaitingToPay(r) ? "Waiting for payment at the cashier" : null)}
        onOpen={(r) => router.push(`/pharmacy?view=dispense&prescriptionId=${r.id}`)}
        refetchIntervalMs={REFRESH_MS}
        empty={{ illustration: "all-done", tone: "good-news", title: "No prescriptions waiting", description: "New prescriptions from doctors will appear here." }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </div>
  );
}
