"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Receipt } from "lucide-react";

import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";

import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
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
        <div className="space-y-3">
          <FolderRecordFeedBanner>
            Expand each line for quantity, unit price, NHIS coverage split, and payer type as stored on the bill.
          </FolderRecordFeedBanner>
          {items.map((item, idx) => (
            <FolderRecordExpandableRow
              key={item.id}
              railIndex={items.length - idx}
              icon={Package}
              eyebrow="Bill line"
              title={<span>{item.serviceName}</span>}
              preview={
                <span className="font-clinical">
                  {item.serviceGroup} · Qty {item.quantity} · {bill.currency}{" "}
                  {minor(item.lineTotalMinor).toFixed(2)} line total
                </span>
              }
              badges={<span className="status-pill text-xs status-pill-pending">{item.payerType}</span>}
            >
              <div className="space-y-3">
                <FolderRecordField label="Service code" value={item.serviceCode?.trim() || null} />
                <FolderRecordField label="Service group" value={item.serviceGroup} />
                <FolderRecordField label="Quantity" value={String(item.quantity)} />
                <FolderRecordField
                  label="Unit price"
                  value={`${bill.currency} ${minor(item.unitPriceMinor).toFixed(2)}`}
                />
                <FolderRecordField
                  label="Line total"
                  value={`${bill.currency} ${minor(item.lineTotalMinor).toFixed(2)}`}
                />
                <FolderRecordField
                  label="NHIS covered"
                  value={
                    minor(item.nhisCoveredMinor) > 0
                      ? `${bill.currency} ${minor(item.nhisCoveredMinor).toFixed(2)}`
                      : null
                  }
                />
                <FolderRecordField
                  label="Discount (line)"
                  value={
                    minor(item.discountMinor) > 0
                      ? `${bill.currency} ${minor(item.discountMinor).toFixed(2)}`
                      : null
                  }
                />
                <FolderRecordField label="Payer type" value={String(item.payerType)} />
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}
    </div>
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
