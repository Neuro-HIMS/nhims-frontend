"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/common/error-state";
import { StatusPill } from "@/components/common/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, isWaitingForPayment, METHOD_KINDS, methodKind } from "@/lib/billing";
import { formatClinicalDate } from "@/lib/dates";
import { claimStatus } from "@/lib/finance";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import { financeService } from "@/services/finance.service";

/** FIN-01 — money in this month, what's owed, and NHIS claims that need attention. */
export function FinanceDashboard() {
  const router = useRouter();
  const dashQuery = useQuery({ queryKey: queryKeys.finance.dashboard, queryFn: () => financeService.dashboard(), refetchInterval: 60_000 });
  const claimsQuery = useQuery({ queryKey: queryKeys.finance.claims, queryFn: () => financeService.listClaims() });
  const billsQuery = useQuery({ queryKey: queryKeys.billing.bills("ALL", ""), queryFn: () => billingService.listBills({}) });
  // The backend's default window: the last 30 days.
  const revenueQuery = useQuery({ queryKey: queryKeys.finance.revenue("", ""), queryFn: () => financeService.revenueSummary() });

  const claims = useMemo(() => claimsQuery.data ?? [], [claimsQuery.data]);
  const waitingClaims = claims.filter((c) => ["DRAFT", "READY", "SUBMITTED"].includes(c.status));
  const actionClaims = claims.filter((c) => c.status === "REJECTED" || c.status === "ACTION_REQUIRED");
  const owed = (billsQuery.data ?? []).filter(isWaitingForPayment).reduce((s, b) => s + b.balanceMinor, 0);

  const byMethod = useMemo(() => {
    const out: Record<string, number> = { CASH: 0, MOMO: 0, CARD: 0, BANK: 0, OTHER: 0 };
    for (const [m, v] of Object.entries(revenueQuery.data?.receivedByMethod ?? {})) out[methodKind(m)] += v;
    return out;
  }, [revenueQuery.data]);
  const days = revenueQuery.data?.dailyReceived ?? [];
  const maxDay = Math.max(1, ...days.map((d) => d.amountMinor));
  const maxMethod = Math.max(1, ...Object.values(byMethod));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat loading={dashQuery.isPending} failed={dashQuery.isError} label="Collected this month" value={formatMoney(dashQuery.data?.monthReceivedMinor)} sub={`Today ${formatMoney(dashQuery.data?.todayReceivedMinor)}`} />
        <Stat loading={billsQuery.isPending} failed={billsQuery.isError} label="Owed by patients" value={formatMoney(owed)} sub="Self-pay, recent bills (last 100)" />
        <Stat
          loading={claimsQuery.isPending}
          failed={claimsQuery.isError}
          label="NHIS claims waiting"
          value={String(waitingClaims.length)}
          sub={formatMoney(waitingClaims.reduce((s, c) => s + c.amountMinor, 0))}
        />
        <Stat loading={claimsQuery.isPending} failed={claimsQuery.isError} label="Claims needing action" value={String(actionClaims.length)} sub="Questioned or rejected" href="/finance?view=nhis-claims" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">Money in, last 30 days</h2>
          {revenueQuery.isError ? (
            <ErrorState error={revenueQuery.error} onRetry={() => void revenueQuery.refetch()} />
          ) : revenueQuery.isPending ? (
            <Skeleton className="mt-3 h-32 w-full" />
          ) : days.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No money received in the last 30 days.</p>
          ) : (
            <>
              <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label={`Money received per day, total ${formatMoney(revenueQuery.data?.totalReceivedMinor)}`}>
                {days.map((d) => (
                  <div key={d.day} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (d.amountMinor / maxDay) * 100)}%` }} title={`${formatClinicalDate(d.day)}: ${formatMoney(d.amountMinor)}`} />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatClinicalDate(days[0].day)} to {formatClinicalDate(days[days.length - 1].day)} · total {formatMoney(revenueQuery.data?.totalReceivedMinor)}
              </p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">How it was paid, last 30 days</h2>
          {revenueQuery.isPending ? (
            <Skeleton className="mt-3 h-32 w-full" />
          ) : revenueQuery.isError ? null : (
            <ul className="mt-3 space-y-2">
              {[...METHOD_KINDS.map((m) => ({ key: m.kind, label: m.label })), { key: "OTHER", label: "NHIS, insurance and waivers" }].map((m) => (
                <li key={m.key} className="grid grid-cols-[10rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(byMethod[m.key] / maxMethod) * 100}%` }} />
                  </span>
                  <span className="text-right font-clinical">{formatMoney(byMethod[m.key])}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Claims needing action</h2>
          <Link href="/finance?view=nhis-claims" className="text-sm font-medium text-primary hover:underline">
            All NHIS claims
          </Link>
        </div>
        {claimsQuery.isError ? (
          <ErrorState error={claimsQuery.error} onRetry={() => void claimsQuery.refetch()} />
        ) : claimsQuery.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : actionClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">None. Claims NHIS questions or rejects will show here with the reason.</p>
        ) : (
          <ul className="divide-y divide-border">
            {actionClaims.slice(0, 5).map((c) => {
              const s = claimStatus(c.status);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => router.push(`/finance?view=claim&claimId=${c.id}`)} className="flex w-full flex-wrap items-center justify-between gap-2 py-2 text-left hover:bg-muted/30">
                    <span>
                      <span className="font-clinical text-foreground">{c.claimReference}</span>
                      <span className="block text-xs text-muted-foreground">{financeService.reasonFor(c) ?? "No reason recorded"}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-clinical">{formatMoney(c.amountMinor)}</span>
                      <StatusPill tone={s.tone}>{s.label}</StatusPill>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, loading, failed, href }: { label: string; value: string; sub?: string; loading: boolean; failed: boolean; href?: string }) {
  const body = (
    <>
      <p className="stat-card-label">{label}</p>
      {loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="stat-card-value">{failed ? "—" : value}</p>}
      {!loading && <p className="text-xs text-muted-foreground">{failed ? "Couldn't load" : sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-border bg-card px-4 py-3 hover:border-primary-border">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-border bg-card px-4 py-3">{body}</div>
  );
}
