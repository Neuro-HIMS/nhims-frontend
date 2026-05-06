"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Receipt, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { billingService } from "@/services/billing.service";
import { METHOD_LABEL, minorToGhs } from "@/components/finance/finance-utils";
import { formatDateTime } from "@/components/billing/lib/billing-utils";

export function PaymentsView() {
  const payments = useQuery({
    queryKey: ["billing", "payments"],
    queryFn: () => billingService.listPayments(),
    refetchInterval: 60_000,
  });

  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo(() => {
    const list = payments.data ?? [];
    return list.filter((p) => {
      if (methodFilter !== "ALL" && p.method !== methodFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const blob =
          `${p.receiptNumber} ${p.payerLabel} ${p.momoTransactionId} ${p.bankReference} ${p.notes}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [payments.data, methodFilter, search]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = payments.data ?? [];
    const todayList = list.filter((p) => p.receivedAt && new Date(p.receivedAt) >= today);
    return {
      total: list.length,
      sumAll: list.reduce((s, p) => s + p.amountMinor, 0),
      sumToday: todayList.reduce((s, p) => s + p.amountMinor, 0),
      countToday: todayList.length,
    };
  }, [payments.data]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Today receipts" value={String(stats.countToday)} />
        <Stat label="Today collected" value={`GH₵ ${minorToGhs(stats.sumToday)}`} />
        <Stat label="Recent receipts" value={String(stats.total)} />
        <Stat label="Recent total" value={`GH₵ ${minorToGhs(stats.sumAll)}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt no, MoMo txn, bank ref…"
            className="pl-9 font-clinical"
          />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All methods</SelectItem>
            {Object.entries(METHOD_LABEL).map(([v, label]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {payments.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payments…
        </p>
      )}

      {payments.data && filtered.length === 0 && !payments.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No payments match your filters.</p>
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Receipt</Th>
                <Th>When</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th className="text-right">Amount</Th>
                <Th>Bill</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-clinical text-primary">{p.receiptNumber}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(p.receivedAt)}</td>
                  <td className="px-4 py-3 text-sm">{METHOD_LABEL[p.method] ?? p.method}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-clinical">
                    {p.momoTransactionId || p.bankReference || p.payerLabel || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-clinical font-semibold">GH₵ {minorToGhs(p.amountMinor)}</td>
                  <td className="px-4 py-3">
                    {p.billId ? (
                      <Link
                        href={`/billing?view=bills&billId=${p.billId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View bill
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">unallocated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-clinical text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}
