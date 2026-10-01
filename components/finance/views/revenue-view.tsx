"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { BillsTable } from "@/components/billing/bills-table";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { daysAgoLocal, formatMoney, isWaitingForPayment, methodLabel, todayLocal } from "@/lib/billing";
import { formatClinicalDate } from "@/lib/dates";
import { streamLabel } from "@/lib/finance";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import { financeService } from "@/services/finance.service";

type Period = "THIS_MONTH" | "LAST_MONTH" | "30D" | "CUSTOM";

function monthBounds(offset: number): [string, string] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [iso(first), offset === 0 ? todayLocal() : iso(last)];
}

/** FIN-04 — money received in a period, by where it came from and how it was paid; money still owed. */
export function RevenueView() {
  const [period, setPeriod] = useState<Period>("THIS_MONTH");
  const [from, setFrom] = useState(daysAgoLocal(29));
  const [to, setTo] = useState(todayLocal());
  const [start, end] = period === "THIS_MONTH" ? monthBounds(0) : period === "LAST_MONTH" ? monthBounds(-1) : period === "30D" ? [daysAgoLocal(29), todayLocal()] : [from, to];

  const revenueQuery = useQuery({ queryKey: queryKeys.finance.revenue(start, end), queryFn: () => financeService.revenueSummary({ from: start, to: end }) });
  const billsQuery = useQuery({ queryKey: queryKeys.billing.bills("ALL", ""), queryFn: () => billingService.listBills({}) });

  const r = revenueQuery.data;
  const streams = useMemo(() => Object.entries(r?.receivedByStream ?? {}).sort((a, b) => b[1] - a[1]), [r]);
  const methods = useMemo(() => Object.entries(r?.receivedByMethod ?? {}).sort((a, b) => b[1] - a[1]), [r]);
  const owed = useMemo(() => (billsQuery.data ?? []).filter(isWaitingForPayment).sort((a, b) => b.balanceMinor - a.balanceMinor), [billsQuery.data]);

  function download() {
    if (!r) return;
    const lines: string[][] = [["Section", "Item", "Amount (GHS)"]];
    lines.push(["Total", "Money received", (r.totalReceivedMinor / 100).toFixed(2)]);
    for (const [k, v] of streams) lines.push(["Where from", streamLabel(k), (v / 100).toFixed(2)]);
    for (const [k, v] of methods) lines.push(["How paid", methodLabel(k), (v / 100).toFixed(2)]);
    for (const d of r.dailyReceived) lines.push(["Per day", d.day, (d.amountMinor / 100).toFixed(2)]);
    const csv = lines.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 w-44" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="THIS_MONTH">This month</SelectItem>
              <SelectItem value="LAST_MONTH">Last month</SelectItem>
              <SelectItem value="30D">Last 30 days</SelectItem>
              <SelectItem value="CUSTOM">Choose dates</SelectItem>
            </SelectContent>
          </Select>
          {period === "CUSTOM" && (
            <>
              <Input type="date" aria-label="From" className="h-9 w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" aria-label="To" className="h-9 w-40" value={to} min={from} max={todayLocal()} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <span className="text-sm text-muted-foreground">
            {formatClinicalDate(start)} to {formatClinicalDate(end)}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={download} disabled={!r}>
          <Download className="mr-1.5 h-4 w-4" /> Download as spreadsheet
        </Button>
      </div>

      {revenueQuery.isError ? (
        <ErrorState error={revenueQuery.error} onRetry={() => void revenueQuery.refetch()} />
      ) : revenueQuery.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="stat-card-label">Money received</p>
              <p className="stat-card-value">{formatMoney(r!.totalReceivedMinor)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="stat-card-label">Expected from NHIS and insurers</p>
              <p className="stat-card-value">{formatMoney(r!.totalAccruedMinor)}</p>
              <p className="text-xs text-muted-foreground">Claimed, not yet paid</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="stat-card-label">Days with money in</p>
              <p className="stat-card-value">{r!.dailyReceived.filter((d) => d.amountMinor > 0).length}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Where it came from" rows={streams.map(([k, v]) => [streamLabel(k), v])} total={r!.totalReceivedMinor} />
            <Breakdown title="How it was paid" rows={methods.map(([k, v]) => [methodLabel(k), v])} total={r!.totalReceivedMinor} />
          </div>
          <p className="text-xs text-muted-foreground">Money by department isn&apos;t available yet.</p>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Money owed, not yet paid</h2>
        <BillsTable
          rows={billsQuery.data ? owed.slice(0, 10) : undefined}
          isLoading={billsQuery.isPending}
          error={billsQuery.error}
          onRetry={() => void billsQuery.refetch()}
          onTakePayment={() => {}}
          hideActions
          empty={{ illustration: "all-done", tone: "good-news", title: "Nothing owed", description: "Every self-pay bill is paid." }}
        />
        {owed.length > 10 && <p className="text-xs text-muted-foreground">Showing the 10 largest of {owed.length} in the last 100 bills. See Bills and payments for older ones.</p>}
      </section>
    </div>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing received in this period.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map(([label, v]) => (
            <li key={label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <span>
                <span className="text-foreground">{label}</span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${total ? (v / total) * 100 : 0}%` }} />
                </span>
              </span>
              <span className="font-clinical">{formatMoney(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
