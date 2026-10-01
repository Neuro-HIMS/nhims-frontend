"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { BillsTable } from "@/components/billing/bills-table";
import { TakePaymentDialog } from "@/components/billing/take-payment-dialog";
import { ErrorState } from "@/components/common/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, isTakenAtDesk, isWaitingForPayment, localDay, METHOD_KINDS, todayLocal, totalsByMethod } from "@/lib/billing";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import type { BillDto } from "@/types/finance.types";

/** BIL-01 — what's waiting, what came in today, and how. */
export function BillingDashboardView() {
  const [paying, setPaying] = useState<BillDto | null>(null);

  const billsQuery = useQuery({
    queryKey: queryKeys.billing.bills("ALL", ""),
    queryFn: () => billingService.listBills({}),
    refetchInterval: 30_000,
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.billing.payments,
    queryFn: () => billingService.listPayments(),
    refetchInterval: 30_000,
  });
  const reversalsQuery = useQuery({
    queryKey: queryKeys.billing.reversals,
    queryFn: () => billingService.reversals(),
    enabled: billingService.reversalAvailable(),
  });

  const today = todayLocal();
  const stats = useMemo(() => {
    const bills = billsQuery.data ?? [];
    const waiting = bills.filter(isWaitingForPayment);
    const reversed = new Set((reversalsQuery.data ?? []).map((r) => r.paymentId));
    // Money taken at the desk today: no NHIS/insurance payouts or waivers, no reversed payments.
    const taken = (paymentsQuery.data ?? []).filter((p) => localDay(p.receivedAt) === today && isTakenAtDesk(p.method) && !reversed.has(p.id));
    return {
      waiting: [...waiting].sort((a, b) => (a.issuedAt ?? "").localeCompare(b.issuedAt ?? "")),
      waitingSum: waiting.reduce((s, b) => s + b.balanceMinor, 0),
      partPaid: bills.filter((b) => b.status === "PARTIAL").length,
      cancelledToday: bills.filter((b) => b.status === "CANCELLED" && localDay(b.closedAt ?? b.updatedAt) === today).length,
      collected: taken.reduce((s, p) => s + p.amountMinor, 0),
      receipts: taken.length,
      byMethod: totalsByMethod(taken),
    };
  }, [billsQuery.data, paymentsQuery.data, reversalsQuery.data, today]);

  const billsLoading = billsQuery.isPending;
  const maxMethod = Math.max(1, ...METHOD_KINDS.map((m) => stats.byMethod[m.kind]));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat loading={billsLoading} failed={billsQuery.isError} label="Waiting for payment" value={String(stats.waiting.length)} sub={formatMoney(stats.waitingSum)} />
        <Stat
          loading={paymentsQuery.isPending}
          failed={paymentsQuery.isError}
          label="Collected today"
          value={formatMoney(stats.collected)}
          sub={`${stats.receipts} receipt${stats.receipts === 1 ? "" : "s"}`}
        />
        <Stat loading={billsLoading} failed={billsQuery.isError} label="Part paid" value={String(stats.partPaid)} sub="Bills with money still owed" />
        <Stat loading={billsLoading} failed={billsQuery.isError} label="Cancelled today" value={String(stats.cancelledToday)} />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">Collected today by method</h2>
        {paymentsQuery.isError ? (
          <ErrorState error={paymentsQuery.error} onRetry={() => void paymentsQuery.refetch()} />
        ) : paymentsQuery.isPending ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : stats.receipts === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payments taken yet today.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {METHOD_KINDS.map((m) => (
              <li key={m.kind} className="grid grid-cols-[9rem_1fr_7rem] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(stats.byMethod[m.kind] / maxMethod) * 100}%` }} />
                </span>
                <span className="text-right font-clinical">{formatMoney(stats.byMethod[m.kind])}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Waiting for payment</h2>
          {stats.waiting.length > 10 && (
            <Link href="/billing?view=bills" className="text-sm font-medium text-primary hover:underline">
              See all {stats.waiting.length}
            </Link>
          )}
        </div>
        <BillsTable
          rows={billsQuery.data ? stats.waiting.slice(0, 10) : undefined}
          isLoading={billsQuery.isPending}
          error={billsQuery.error}
          onRetry={() => void billsQuery.refetch()}
          empty={{ illustration: "all-done", tone: "good-news", title: "No one is waiting to pay", description: "Bills appear here when doctors order services for self-pay patients." }}
          onTakePayment={setPaying}
        />
        <p className="text-xs text-muted-foreground">Counts come from the latest 100 bills. Search Bills for a patient to see older ones.</p>
      </section>

      <TakePaymentDialog bill={paying} onOpenChange={(o) => !o && setPaying(null)} />
    </div>
  );
}

function Stat({ label, value, sub, loading, failed }: { label: string; value: string; sub?: string; loading: boolean; failed: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="stat-card-label">{label}</p>
      {loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="stat-card-value">{failed ? "—" : value}</p>}
      {!loading && (failed ? <p className="text-xs text-muted-foreground">Couldn&apos;t load</p> : sub && <p className="text-xs text-muted-foreground">{sub}</p>)}
    </div>
  );
}
