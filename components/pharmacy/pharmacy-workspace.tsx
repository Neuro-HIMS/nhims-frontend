"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, Pill, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth.store";
import { useEncountersStore } from "@/store/encounters.store";
import { calculateAge, formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { Prescription, PrescriptionStatus } from "@/lib/clinical-types";

const SUB_NAV = [
  { label: "Dispensing Queue", view: "queue", href: "/pharmacy?view=queue" },
  { label: "Dispense", view: "dispense", href: "/pharmacy?view=dispense" },
  { label: "Inventory", view: "inventory", href: "/pharmacy?view=inventory" },
];

export function PharmacyWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "queue";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pharmacy</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Dispense prescriptions assigned to your station. You see the prescription only - patient folders
          are restricted to clinicians, but allergies are surfaced for safe dispensing.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/pharmacy" />
      <div className="pt-2">
        {view === "queue" && <QueueView />}
        {view === "dispense" && <DispenseView />}
        {view === "inventory" && <InventoryView />}
      </div>
    </div>
  );
}

const ACTIVE: PrescriptionStatus[] = ["ordered", "awaiting-payment", "ready-to-dispense", "partially-dispensed"];

// ── Queue ─────────────────────────────────────────────────────────────

function QueueView() {
  const prescriptions = useEncountersStore((s) => s.prescriptions);
  const [filter, setFilter] = useState<"active" | "all" | PrescriptionStatus>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(
    () =>
      prescriptions
        .filter((rx) => (filter === "all" ? true : filter === "active" ? ACTIVE.includes(rx.status) : rx.status === filter))
        .sort((a, b) => b.prescribedAt.localeCompare(a.prescribedAt)),
    [prescriptions, filter]
  );

  const stats = useMemo(() => ({
    pending: prescriptions.filter((r) => r.status === "ordered" || r.status === "awaiting-payment").length,
    partial: prescriptions.filter((r) => r.status === "partially-dispensed").length,
    dispensed: prescriptions.filter((r) => r.status === "dispensed" && isToday(r.prescribedAt)).length,
  }), [prescriptions]);

  const selected = list.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Partially Dispensed" value={stats.partial} accent="warn" />
        <Stat label="Dispensed Today" value={stats.dispensed} accent="ok" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ordered">Ordered (new)</SelectItem>
            <SelectItem value="ready-to-dispense">Ready to dispense</SelectItem>
            <SelectItem value="partially-dispensed">Partially dispensed</SelectItem>
            <SelectItem value="dispensed">Dispensed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{list.length} prescriptions</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Pill className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No prescriptions in this view.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Patient</Th>
                  <Th>Items</Th>
                  <Th>Prescriber</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((rx) => (
                  <tr key={rx.id} onClick={() => setSelectedId(rx.id)} className={`table-row-interactive ${selectedId === rx.id ? "bg-muted/60" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{rx.patientName}</p>
                      <p className="patient-id mt-0.5">{rx.patientId} · {rx.patientSex} · {calculateAge(rx.patientDob)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{rx.lines.length} item{rx.lines.length === 1 ? "" : "s"}</p>
                      <p className="text-xs text-muted-foreground">{rx.lines.slice(0, 2).map((l) => `${l.drug} ${l.strength}`).join(", ")}{rx.lines.length > 2 ? "…" : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{rx.prescribedBy}</td>
                    <td className="px-4 py-3"><RxStatusPill status={rx.status} /></td>
                    <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <DispensePanel rx={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Pill className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select a prescription to dispense</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Dispense panel ────────────────────────────────────────────────────

function DispensePanel({ rx, onClose }: { rx: Prescription; onClose: () => void }) {
  const dispense = useEncountersStore((s) => s.dispensePrescription);
  const setStatus = useEncountersStore((s) => s.setPrescriptionStatus);
  const billing = useEncountersStore((s) => s.billing);
  const allergies = useEncountersStore((s) => s.alerts).filter((a) => a.patientId === rx.patientId && a.category === "allergy");
  const user = useAuthStore((s) => s.user);
  const userLabel = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Pharmacist";

  const [qty, setQty] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    rx.lines.forEach((l) => { m[l.id] = String(l.quantity - (l.dispensedQty ?? 0)); });
    return m;
  });
  const [notes, setNotes] = useState(rx.pharmacyNotes ?? "");

  const billingForRx = billing.filter((b) => rx.lines.some((l) => l.id === b.sourceRef));
  const totalAmount = billingForRx.reduce((sum, b) => sum + b.amount, 0);
  const allPaid = billingForRx.every((b) => b.status === "paid" || b.status === "claimed" || b.status === "waived");

  function handleDispense() {
    const lineDispensed: Record<string, number> = {};
    let any = false;
    rx.lines.forEach((l) => {
      const n = parseInt(qty[l.id] ?? "0") || 0;
      const remaining = l.quantity - (l.dispensedQty ?? 0);
      if (n < 0) return;
      const total = (l.dispensedQty ?? 0) + Math.min(n, remaining);
      lineDispensed[l.id] = total;
      if (n > 0) any = true;
    });
    if (!any) {
      toast.error("Enter quantity to dispense for at least one line");
      return;
    }
    dispense(rx.id, userLabel, lineDispensed, notes.trim() || undefined);
    toast.success("Dispensed and recorded in patient folder");
    onClose();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dispense Prescription</CardTitle>
        <CardDescription>{rx.id} · {formatDateTime(rx.prescribedAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient context (limited)</p>
          <p className="mt-1 font-medium text-foreground">{rx.patientName}</p>
          <p className="patient-id">{rx.patientId} · {rx.patientSex} · {calculateAge(rx.patientDob)}</p>
          <p className="mt-2 text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline h-3 w-3" /> Full clinical folder is restricted to clinicians.</p>
        </div>

        {allergies.length > 0 && (
          <div className="alert-critical flex items-start gap-2 rounded-md border px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold uppercase tracking-wider">Allergies (always shown for safety)</p>
              <ul className="mt-1 space-y-0.5">
                {allergies.map((a) => (
                  <li key={a.id}><strong>{a.label}</strong>{a.notes ? ` - ${a.notes}` : ""}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DataRow label="Prescribed by" value={rx.prescribedBy} />
        <DataRow label="Items" value={String(rx.lines.length)} />
        <DataRow label="Total" value={`GHS ${totalAmount.toFixed(2)}`} mono />
        <DataRow label="Payment" value={allPaid ? "Settled / NHIS-claimed" : "Pending at cashier"} />

        <Separator />

        <div className="space-y-2">
          {rx.lines.map((l) => {
            const remaining = l.quantity - (l.dispensedQty ?? 0);
            const dispensed = (l.dispensedQty ?? 0);
            return (
              <div key={l.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{l.drug} {l.strength}</p>
                    <p className="text-xs text-muted-foreground">{l.form} · {l.route} · {l.frequency} · {l.durationDays}d</p>
                    {l.instructions && <p className="mt-1 text-xs text-foreground italic">{l.instructions}</p>}
                  </div>
                  <span className="patient-id shrink-0">{dispensed}/{l.quantity}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Dispense now</label>
                  <Input
                    type="number"
                    min={0}
                    max={remaining}
                    value={qty[l.id] ?? ""}
                    onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                    className="h-8 w-24 font-clinical text-sm"
                    disabled={remaining === 0}
                  />
                  <span className="text-xs text-muted-foreground">of {remaining} remaining</span>
                </div>
              </div>
            );
          })}
        </div>

        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Counselling notes / out-of-stock notes…" />

        <div className="flex flex-col gap-2">
          <Button onClick={handleDispense} disabled={!allPaid && billingForRx.length > 0}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {allPaid ? "Dispense & Record" : "Awaiting payment"}
          </Button>
          {!allPaid && (
            <Button variant="outline" size="sm" onClick={() => setStatus(rx.id, "ready-to-dispense")}>
              Mark Ready Once Paid
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Manual dispense view ──────────────────────────────────────────────

function DispenseView() {
  const prescriptions = useEncountersStore((s) => s.prescriptions);
  const [query, setQuery] = useState("");

  const matched = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return prescriptions.filter((rx) =>
      rx.id.toLowerCase().includes(q) || rx.patientId.toLowerCase().includes(q) || rx.patientName.toLowerCase().includes(q)
    );
  }, [prescriptions, query]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = matched.find((rx) => rx.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual Dispense</CardTitle>
          <CardDescription>Search by Patient ID, Patient Name, or Prescription No.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="GH-2026-XXXXX or RX-XXXXX or name…" className="font-clinical" />
          {query && matched.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching prescription.</p>
          )}
          {matched.length > 0 && (
            <div className="space-y-2">
              {matched.map((rx) => (
                <button
                  key={rx.id}
                  onClick={() => setSelectedId(rx.id)}
                  className={`w-full rounded-md border border-border p-3 text-left text-sm transition-colors hover:bg-accent/5 ${selectedId === rx.id ? "border-primary/50" : ""}`}
                >
                  <p className="font-medium">{rx.patientName}</p>
                  <p className="patient-id mt-0.5">{rx.patientId} · {rx.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{rx.lines.length} items · {rx.status}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <DispensePanel rx={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ── Inventory (mock; backend will own this) ───────────────────────────

function InventoryView() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>Drug</Th>
              <Th>Form</Th>
              <Th className="text-right">Stock</Th>
              <Th className="text-right">Reorder At</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DRUG_STOCK.map((d) => (
              <tr key={d.name} className="table-row-interactive">
                <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{d.form}</td>
                <td className="px-4 py-3 text-right font-clinical text-foreground">{d.stock}</td>
                <td className="px-4 py-3 text-right font-clinical text-muted-foreground">{d.reorderAt}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill text-xs ${d.stock <= d.reorderAt ? "status-pill-inactive" : "status-pill-active"}`}>
                    {d.stock <= d.reorderAt ? <><AlertTriangle className="mr-1 h-3 w-3 inline" />Low Stock</> : "Adequate"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function isToday(iso: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-sm font-medium text-foreground ${mono ? "font-clinical" : ""}`}>{value}</span>
    </div>
  );
}

function RxStatusPill({ status }: { status: PrescriptionStatus }) {
  const cls =
    status === "dispensed"
      ? "status-pill-active"
      : status === "partially-dispensed"
      ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
      : status === "cancelled"
      ? "status-pill-inactive"
      : "status-pill-pending";
  return <span className={`status-pill text-xs ${cls}`}>{status}</span>;
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>{children}</th>;
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "warn" | "ok" | "info" }) {
  const cls =
    accent === "warn"
      ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
      : accent === "ok"
      ? "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))] text-[hsl(var(--clinical-routine))]"
      : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-clinical text-2xl font-semibold">{value}</p>
    </div>
  );
}

const DRUG_STOCK = [
  { name: "Artemether/Lumefantrine 20/120mg", form: "Tablet", stock: 48, reorderAt: 100 },
  { name: "Amoxicillin 500mg", form: "Capsule", stock: 340, reorderAt: 200 },
  { name: "Metformin 500mg", form: "Tablet", stock: 210, reorderAt: 150 },
  { name: "Paracetamol 500mg", form: "Tablet", stock: 1200, reorderAt: 500 },
  { name: "Lisinopril 5mg", form: "Tablet", stock: 180, reorderAt: 100 },
  { name: "ORS Sachets", form: "Sachet", stock: 88, reorderAt: 200 },
  { name: "IV Fluid Normal Saline 500ml", form: "IV Bag", stock: 24, reorderAt: 50 },
];
