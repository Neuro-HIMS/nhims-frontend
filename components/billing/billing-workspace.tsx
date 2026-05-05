"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, FileText, Receipt, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { BillingItemStatus, BillingLineItem, Visit } from "@/lib/clinical-types";

const SUB_NAV = [
  { label: "Invoices", view: "invoices", href: "/billing?view=invoices" },
  { label: "NHIS Claims", view: "claims", href: "/billing?view=claims" },
  { label: "Payments", view: "payments", href: "/billing?view=payments" },
];

export function BillingWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "invoices";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Invoices group billing line items per visit. Cashier marks items paid; NHIS claims are tracked separately.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/billing" />
      <div className="pt-2">
        {view === "invoices" && <InvoicesView />}
        {view === "claims" && <ClaimsView />}
        {view === "payments" && <PaymentsView />}
      </div>
    </div>
  );
}

// ── Invoices: group billing items by visit ──────────────────────────────

type InvoiceGroup = {
  visit: Visit | null;
  visitId: string;
  patientId: string;
  patientName: string;
  items: BillingLineItem[];
  totalAmount: number;
  outstanding: number;
  claimed: number;
  paid: number;
};

function InvoicesView() {
  const billing = useEncountersStore((s) => s.billing);
  const visits = useEncountersStore((s) => s.visits);
  const setStatus = useEncountersStore((s) => s.setBillingItemStatus);

  const [filter, setFilter] = useState<"outstanding" | "all" | "paid">("outstanding");
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const groups = useMemo<InvoiceGroup[]>(() => {
    const byVisit = new Map<string, BillingLineItem[]>();
    billing.forEach((b) => {
      const list = byVisit.get(b.visitId) ?? [];
      list.push(b);
      byVisit.set(b.visitId, list);
    });
    return Array.from(byVisit.entries()).map(([visitId, items]) => {
      const visit = visits.find((v) => v.id === visitId) ?? null;
      const totalAmount = items.reduce((sum, b) => sum + b.amount, 0);
      const outstanding = items.filter((b) => b.status === "pending").reduce((s, b) => s + b.amount, 0);
      const claimed = items.filter((b) => b.status === "claimed").reduce((s, b) => s + b.amount, 0);
      const paid = items.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0);
      const first = items[0];
      return {
        visit,
        visitId,
        patientId: first.patientId,
        patientName: visit?.patientName ?? first.patientId,
        items: [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        totalAmount,
        outstanding,
        claimed,
        paid,
      };
    }).sort((a, b) => (b.items[0]?.createdAt ?? "").localeCompare(a.items[0]?.createdAt ?? ""));
  }, [billing, visits]);

  const filteredGroups = groups.filter((g) =>
    filter === "all" ? true : filter === "outstanding" ? g.outstanding > 0 : g.outstanding === 0 && g.paid > 0
  );

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => {
        acc.outstanding += g.outstanding;
        acc.paid += g.paid;
        acc.claimed += g.claimed;
        return acc;
      },
      { outstanding: 0, paid: 0, claimed: 0 }
    );
  }, [groups]);

  const selected = groups.find((g) => g.visitId === selectedVisitId) ?? null;

  function payAll(g: InvoiceGroup) {
    const receipt = `RCT-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
    g.items.filter((b) => b.status === "pending").forEach((b) => setStatus(b.id, "paid", { method: paymentMethod, receiptNo: receipt }));
    toast.success(`Receipt ${receipt}`, { description: `${paymentMethod} - GHS ${g.outstanding.toFixed(2)}` });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Outstanding" value={totals.outstanding} accent="warn" />
        <Stat label="Paid" value={totals.paid} accent="ok" />
        <Stat label="NHIS Claimed" value={totals.claimed} accent="info" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="outstanding">Outstanding</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="all">All invoices</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filteredGroups.length} invoices</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No invoices in this view.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Visit</Th>
                  <Th>Patient</Th>
                  <Th>Sponsor</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Outstanding</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGroups.map((g) => (
                  <tr key={g.visitId} onClick={() => setSelectedVisitId(g.visitId)} className={`table-row-interactive ${selectedVisitId === g.visitId ? "bg-muted/60" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-clinical">{g.visit?.visitNo ?? g.visitId}</p>
                      <p className="patient-id mt-0.5">{g.items.length} items</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{g.patientName}</p>
                      <p className="patient-id mt-0.5">{g.patientId}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{g.visit?.sponsor ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-clinical">GHS {g.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-clinical">
                      <span className={g.outstanding > 0 ? "text-[hsl(var(--clinical-urgent))]" : "text-muted-foreground"}>
                        GHS {g.outstanding.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {g.outstanding === 0 ? (
                        <span className="status-pill text-xs status-pill-active">Settled</span>
                      ) : g.claimed > 0 ? (
                        <span className="status-pill text-xs bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]">Mixed/NHIS</span>
                      ) : (
                        <span className="status-pill text-xs status-pill-pending">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invoice {selected.visit?.visitNo ?? selected.visitId}</CardTitle>
              <CardDescription>{selected.patientName} · {selected.patientId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1.5">
                {selected.items.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{b.kind}</p>
                      <p className="text-sm">{b.description}</p>
                      <p className="patient-id mt-0.5">{b.quantity} × GHS {b.unitPrice.toFixed(2)} · {formatDateTime(b.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-clinical font-semibold">GHS {b.amount.toFixed(2)}</span>
                      <BillingStatusPill status={b.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-md bg-muted/40 p-3">
                <Row label="Total" value={`GHS ${selected.totalAmount.toFixed(2)}`} bold />
                {selected.claimed > 0 && <Row label="NHIS Claimed" value={`GHS ${selected.claimed.toFixed(2)}`} />}
                {selected.paid > 0 && <Row label="Paid" value={`GHS ${selected.paid.toFixed(2)}`} />}
                <Row label="Outstanding" value={`GHS ${selected.outstanding.toFixed(2)}`} bold />
              </div>

              {selected.outstanding > 0 && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => payAll(selected)}>
                    <CreditCard className="mr-1.5 h-4 w-4" />
                    Record Payment - GHS {selected.outstanding.toFixed(2)}
                  </Button>
                </>
              )}

              <p className="text-xs text-muted-foreground">
                <ShieldCheck className="mr-1 inline h-3 w-3" />
                Items marked "serviced" only after the lab/pharmacy/radiology actually delivered the service.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select an invoice to view line items</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ClaimsView() {
  const billing = useEncountersStore((s) => s.billing);
  const claimed = billing.filter((b) => b.status === "claimed");
  const total = claimed.reduce((s, b) => s + b.amount, 0);

  if (claimed.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ShieldCheck className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No NHIS-claimed billing items yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Claims Pending" value={total} accent="info" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>Created</Th>
              <Th>Patient</Th>
              <Th>Service</Th>
              <Th>Description</Th>
              <Th className="text-right">Amount</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {claimed.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</td>
                <td className="px-4 py-2.5 patient-id">{b.patientId}</td>
                <td className="px-4 py-2.5 capitalize text-xs">{b.kind}</td>
                <td className="px-4 py-2.5">{b.description}</td>
                <td className="px-4 py-2.5 text-right font-clinical">GHS {b.amount.toFixed(2)}</td>
                <td className="px-4 py-2.5"><BillingStatusPill status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsView() {
  const billing = useEncountersStore((s) => s.billing);
  const paid = billing.filter((b) => b.status === "paid").sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));

  if (paid.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Receipt className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <Th>Date</Th>
            <Th>Patient</Th>
            <Th>Service</Th>
            <Th>Method</Th>
            <Th className="text-right">Amount</Th>
            <Th>Receipt</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paid.map((b) => (
            <tr key={b.id} className="table-row-interactive">
              <td className="px-4 py-3 text-xs text-muted-foreground">{b.paidAt ? formatDateTime(b.paidAt) : "—"}</td>
              <td className="px-4 py-3 patient-id">{b.patientId}</td>
              <td className="px-4 py-3 capitalize text-xs">{b.kind}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{b.paymentMethod ?? "—"}</td>
              <td className="px-4 py-3 text-right font-clinical">GHS {b.amount.toFixed(2)}</td>
              <td className="px-4 py-3 font-clinical text-xs text-primary">{b.receiptNo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-clinical ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</span>
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
      <p className="font-clinical text-2xl font-semibold">GHS {value.toFixed(2)}</p>
    </div>
  );
}

function BillingStatusPill({ status }: { status: BillingItemStatus }) {
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
  return <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>{children}</th>;
}
