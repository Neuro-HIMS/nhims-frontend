"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FilePlus2, Loader2, Receipt, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { billingService } from "@/services/billing.service";
import { minorToGhs, PAYER_LABEL } from "@/components/finance/finance-utils";
import { BILL_STATUS_LABEL, billStatusPill, formatDateTime } from "@/components/billing/lib/billing-utils";

type StatusFilter = "ALL" | "OPEN" | "INVOICED" | "PARTIAL" | "PAID" | "CANCELLED";

export function BillsView() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState<string>("");

  const bills = useQuery({
    queryKey: ["billing", "bills", status, search],
    queryFn: () =>
      billingService.listBills({
        status: status === "ALL" ? undefined : status,
        search: search.trim() || undefined,
      }),
    refetchInterval: 60_000,
  });

  const totals = useMemo(() => {
    const list = bills.data ?? [];
    return {
      count: list.length,
      total: list.reduce((s, b) => s + b.totalMinor, 0),
      paid: list.reduce((s, b) => s + b.paidMinor, 0),
      outstanding: list.reduce((s, b) => s + b.balanceMinor, 0),
    };
  }, [bills.data]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Bills" value={String(totals.count)} />
        <SummaryCard label="Billed total" value={`GH₵ ${minorToGhs(totals.total)}`} />
        <SummaryCard label="Collected" value={`GH₵ ${minorToGhs(totals.paid)}`} />
        <SummaryCard label="Outstanding" value={`GH₵ ${minorToGhs(totals.outstanding)}`} accent="warn" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill number, patient, or visit reference…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="INVOICED">Invoiced</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild size="sm">
          <Link href="/billing?view=new">
            <FilePlus2 className="mr-1.5 h-4 w-4" /> New bill
          </Link>
        </Button>
      </div>

      {bills.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading bills…
        </p>
      )}
      {bills.isError && <p className="text-sm text-destructive">Could not load bills.</p>}

      {bills.data && bills.data.length === 0 && !bills.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No bills match your filters.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/billing?view=new">
                <FilePlus2 className="mr-1.5 h-4 w-4" /> Open a new bill
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {bills.data && bills.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Bill</Th>
                <Th>Patient</Th>
                <Th className="hidden md:table-cell">Issued</Th>
                <Th className="hidden lg:table-cell">Payer</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Outstanding</Th>
                <Th>Status</Th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bills.data.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <p className="font-clinical font-medium text-foreground">{b.billNumber}</p>
                    <p className="patient-id mt-0.5">{b.items.length} items</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{b.patientName}</p>
                    <p className="patient-id mt-0.5">{b.patientPublicId || "—"}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {formatDateTime(b.issuedAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {PAYER_LABEL[b.primaryPayer] ?? b.primaryPayer}
                  </td>
                  <td className="px-4 py-3 text-right font-clinical">GH₵ {minorToGhs(b.totalMinor)}</td>
                  <td className="px-4 py-3 text-right font-clinical">
                    <span className={b.balanceMinor > 0 ? "text-[hsl(var(--clinical-urgent))]" : "text-muted-foreground"}>
                      GH₵ {minorToGhs(b.balanceMinor)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={billStatusPill(b.status)}>{BILL_STATUS_LABEL[b.status] ?? b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/billing?view=bills&billId=${b.id}`}>Open</Link>
                    </Button>
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

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "warn" }) {
  const cls =
    accent === "warn"
      ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
      : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-clinical text-xl font-semibold">{value}</p>
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
