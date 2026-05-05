"use client";

import { useMemo } from "react";
import { Receipt } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { BillingItemStatus } from "@/lib/clinical-types";

interface FolderBillingProps {
  patientId: string;
}

export function FolderBilling({ patientId }: FolderBillingProps) {
  const billing = useEncountersStore((s) => s.billing);
  const visits = useEncountersStore((s) => s.visits);

  const items = useMemo(
    () => billing.filter((b) => b.patientId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [billing, patientId]
  );

  const totals = useMemo(() => {
    return items.reduce(
      (acc, b) => {
        acc.total += b.amount;
        if (b.status === "paid") acc.paid += b.amount;
        else if (b.status === "claimed") acc.claimed += b.amount;
        else if (b.status === "pending") acc.outstanding += b.amount;
        return acc;
      },
      { total: 0, paid: 0, claimed: 0, outstanding: 0 }
    );
  }, [items]);

  const visitsById = useMemo(() => {
    const m = new Map<string, string>();
    visits.forEach((v) => m.set(v.id, v.visitNo));
    return m;
  }, [visits]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={totals.total} />
        <Stat label="Outstanding" value={totals.outstanding} accent="warn" />
        <Stat label="NHIS Claimed" value={totals.claimed} accent="info" />
        <Stat label="Paid" value={totals.paid} accent="ok" />
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No billing items for this patient.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Created</Th>
                  <Th>Visit</Th>
                  <Th>Service</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Unit</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Sponsor</Th>
                  <Th>Serviced</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</td>
                    <td className="px-3 py-2 font-clinical text-xs">{visitsById.get(b.visitId) ?? b.visitId}</td>
                    <td className="px-3 py-2 capitalize">{b.kind}</td>
                    <td className="px-3 py-2 text-foreground">{b.description}</td>
                    <td className="px-3 py-2 text-right font-clinical">{b.quantity}</td>
                    <td className="px-3 py-2 text-right font-clinical">{b.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-clinical font-semibold">{b.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs">{b.sponsor}</td>
                    <td className="px-3 py-2">
                      <span className={`status-pill text-xs ${b.serviced ? "status-pill-active" : "status-pill-pending"}`}>
                        {b.serviced ? "Yes" : "Pending"}
                      </span>
                    </td>
                    <td className="px-3 py-2"><StatusPill status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "warn" | "ok" | "info" }) {
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
      <p className="font-clinical text-xl font-semibold">GHS {value.toFixed(2)}</p>
    </div>
  );
}

function StatusPill({ status }: { status: BillingItemStatus }) {
  const cls =
    status === "paid"
      ? "status-pill-active"
      : status === "claimed"
      ? "bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
      : status === "waived" || status === "cancelled"
      ? "status-pill-inactive"
      : "status-pill-pending";
  return <span className={`status-pill text-xs ${cls}`}>{status}</span>;
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>{children}</th>;
}
