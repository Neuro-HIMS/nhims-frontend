"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getFriendlyError } from "@/lib/api-errors";
import { formatMoney } from "@/lib/billing";
import { formatClinicalDateTime } from "@/lib/dates";

import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { financeService } from "@/services/finance.service";

const SENT = ["SUBMITTED", "PAID", "REJECTED", "ACTION_REQUIRED"];

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** FIN-09 — a month of NHIS claims: how many were sent, accepted and rejected, and why. */
export function NhisReportsView() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const claimsQuery = useQuery({ queryKey: queryKeys.finance.claims, queryFn: () => financeService.listClaims() });
  const reportsQuery = useQuery({ queryKey: queryKeys.finance.reports, queryFn: () => financeService.listReports() });

  const stats = useMemo(() => {
    // A claim belongs to the month of its visit.
    const inMonth = (claimsQuery.data ?? []).filter((c) => (c.servicePeriodStart ?? c.createdAt ?? "").startsWith(month));
    const sent = inMonth.filter((c) => SENT.includes(c.status));
    const decided = sent.filter((c) => c.status !== "SUBMITTED");
    const accepted = decided.filter((c) => c.status === "PAID");
    const rejected = decided.filter((c) => c.status === "REJECTED" || c.status === "ACTION_REQUIRED");
    const reasons = new Map<string, number>();
    for (const c of rejected) {
      const r = financeService.reasonFor(c) ?? "No reason recorded";
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
    }
    return {
      total: inMonth.length,
      sent: sent.length,
      sentValue: sent.reduce((s, c) => s + c.amountMinor, 0),
      waiting: sent.length - decided.length,
      acceptedPct: decided.length ? Math.round((accepted.length / decided.length) * 100) : null,
      rejectedPct: decided.length ? Math.round((rejected.length / decided.length) * 100) : null,
      acceptedValue: accepted.reduce((s, c) => s + c.amountMinor, 0),
      reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [claimsQuery.data, month]);

  const saveMut = useMutation({
    mutationFn: () => financeService.generateReport({ periodLabel: month, reportType: "NHIS_MONTHLY" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.finance.reports });
      toast.success(`Summary for ${monthName(month)} saved.`);
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  function download(label: string, json: string) {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nhis-summary-${label}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nhis-month">Month</Label>
          <Input id="nhis-month" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-48" />
        </div>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || claimsQuery.isPending}>
          {saveMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Save summary
        </Button>
      </div>

      {claimsQuery.isError ? (
        <ErrorState error={claimsQuery.error} onRetry={() => void claimsQuery.refetch()} />
      ) : claimsQuery.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : stats.total === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No NHIS claims for visits in {monthName(month)}.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Claims sent" value={String(stats.sent)} sub={`${formatMoney(stats.sentValue)} · ${stats.total - stats.sent} not sent yet`} />
            <Stat label="Accepted" value={stats.acceptedPct === null ? "—" : `${stats.acceptedPct}%`} sub={formatMoney(stats.acceptedValue)} />
            <Stat label="Questioned or rejected" value={stats.rejectedPct === null ? "—" : `${stats.rejectedPct}%`} sub="Of those NHIS has answered" />
            <Stat label="Waiting for NHIS" value={String(stats.waiting)} sub="Sent, no answer yet" />
          </div>
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">Most common reasons</h2>
            {stats.reasons.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No claims were questioned or rejected.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {stats.reasons.map(([r, n]) => (
                  <li key={r} className="flex justify-between gap-3 py-1.5">
                    <span className="text-foreground">{r}</span>
                    <span className="font-clinical text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">Saved summaries</h2>
        <p className="text-xs text-muted-foreground">A saved summary records the totals of all claims at the time it was saved.</p>
        {reportsQuery.isError ? (
          <ErrorState error={reportsQuery.error} onRetry={() => void reportsQuery.refetch()} />
        ) : reportsQuery.isPending ? (
          <Skeleton className="mt-3 h-16 w-full" />
        ) : (reportsQuery.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None saved yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {(reportsQuery.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-foreground">
                  All claims{/^\d{4}-\d{2}$/.test(r.periodLabel) ? ` (saved for ${monthName(r.periodLabel)})` : ""}
                  <span className="block text-xs text-muted-foreground">Saved {formatClinicalDateTime(r.createdAt)}</span>
                </span>
                <Button size="sm" variant="outline" onClick={() => download(r.periodLabel, r.payloadJson)}>
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
