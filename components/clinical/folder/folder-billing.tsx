"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Receipt } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import type { BillItemDto } from "@/types/finance.types";
import type { Visit } from "@/lib/clinical-types";

interface FolderBillingProps {
  visit: Visit | null;
}

/**
 * Patient folder billing tab. Reads the encounter's running bill from
 * the backend (`/clinical/encounters/{id}/bill`) so the items reflect
 * what the cashier will actually settle. Falls back to a friendly
 * placeholder before any chargeable event has been recorded.
 */
export function FolderBilling({ visit }: FolderBillingProps) {
  const billQuery = useQuery({
    queryKey: visit ? ["clinical", "encounter-bill", visit.id] : ["clinical", "encounter-bill", "idle"],
    queryFn: () => clinicalService.encounterBill(visit!.id),
    enabled: Boolean(visit),
  });

  const bill = billQuery.data ?? null;
  const items = bill?.items ?? [];

  const totals = useMemo(() => {
    if (!bill) return { subtotal: 0, total: 0, paid: 0, balance: 0, nhis: 0 };
    return {
      subtotal: minor(bill.subtotalMinor),
      total: minor(bill.totalMinor),
      paid: minor(bill.paidMinor),
      balance: minor(bill.balanceMinor),
      nhis: minor(bill.nhisCoveredMinor),
    };
  }, [bill]);

  if (!visit) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Receipt className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Pick a visit to view its bill.</p>
        </CardContent>
      </Card>
    );
  }

  if (billQuery.isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading bill…
        </CardContent>
      </Card>
    );
  }

  if (!bill) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Receipt className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No chargeable events yet. The bill is created the first time a lab order, prescription
            or procedure is recorded for this encounter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={totals.total} currency={bill.currency} />
        <Stat label="Outstanding" value={totals.balance} currency={bill.currency} accent="warn" />
        <Stat label="NHIS Covered" value={totals.nhis} currency={bill.currency} accent="info" />
        <Stat label="Paid" value={totals.paid} currency={bill.currency} accent="ok" />
      </div>

      <Card>
        <CardContent className="px-4 py-3 text-xs text-muted-foreground">
          Bill <span className="font-clinical text-foreground">{bill.billNumber}</span> · Status:{" "}
          <span className="font-medium text-foreground">{bill.status.toLowerCase()}</span>
          {bill.issuedAt && <> · Issued {formatDateTime(bill.issuedAt)}</>}
          {bill.closedAt && <> · Closed {formatDateTime(bill.closedAt)}</>}
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No items on this bill yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Service</Th>
                  <Th>Group</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Unit</Th>
                  <Th className="text-right">Line</Th>
                  <Th className="text-right">NHIS</Th>
                  <Th>Payer</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((b) => (
                  <BillRow key={b.id} item={b} currency={bill.currency} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BillRow({ item, currency }: { item: BillItemDto; currency: string }) {
  return (
    <tr>
      <td className="px-3 py-2">
        <p className="font-medium text-foreground">{item.serviceName}</p>
        {item.serviceCode && (
          <p className="patient-id mt-0.5 text-[10px] uppercase">{item.serviceCode}</p>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{item.serviceGroup}</td>
      <td className="px-3 py-2 text-right font-clinical">{item.quantity}</td>
      <td className="px-3 py-2 text-right font-clinical">
        {currency} {minor(item.unitPriceMinor).toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right font-clinical font-semibold">
        {currency} {minor(item.lineTotalMinor).toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right font-clinical text-muted-foreground">
        {minor(item.nhisCoveredMinor) > 0
          ? `${currency} ${minor(item.nhisCoveredMinor).toFixed(2)}`
          : "—"}
      </td>
      <td className="px-3 py-2">
        <span className="status-pill text-xs status-pill-pending">{item.payerType}</span>
      </td>
    </tr>
  );
}

function minor(v: number | null | undefined) {
  return (Number(v ?? 0) || 0) / 100;
}

function Stat({
  label,
  value,
  currency,
  accent,
}: {
  label: string;
  value: number;
  currency: string;
  accent?: "warn" | "ok" | "info";
}) {
  const cls =
    accent === "warn"
      ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
      : accent === "ok"
        ? "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))] text-[hsl(var(--clinical-routine))]"
        : accent === "info"
          ? "border-[hsl(var(--notice-info-border))] bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
          : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-clinical text-xl font-semibold">
        {currency} {value.toFixed(2)}
      </p>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
