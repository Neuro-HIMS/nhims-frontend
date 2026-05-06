"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, Pill, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type {
  DispenseLineInput,
  DispensePayload,
  PrescriptionDto,
  PrescriptionStatus,
} from "@/types/clinical.types";

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
          Dispense prescriptions assigned to your station. You see the prescription only —
          patient folders are restricted to clinicians, but allergies are surfaced for safe dispensing.
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

const FILTERS: { value: "ACTIVE" | PrescriptionStatus | "ALL"; label: string }[] = [
  { value: "ACTIVE", label: "Active queue" },
  { value: "ORDERED", label: "Ordered (new)" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "READY", label: "Ready" },
  { value: "PARTIALLY_DISPENSED", label: "Partially dispensed" },
  { value: "DISPENSED", label: "Dispensed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ALL", label: "All" },
];

// ── Queue ─────────────────────────────────────────────────────────────

function QueueView() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ACTIVE");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: [...queryKeys.clinical.pharmacyQueue, filter],
    queryFn: () =>
      clinicalService.pharmacyWorklist(
        filter === "ACTIVE" ? "READY" : filter === "ALL" ? undefined : filter,
      ),
  });

  const list = queueQuery.data ?? [];

  const stats = useMemo(() => {
    return {
      ready: list.filter((r) => r.status === "READY").length,
      partial: list.filter((r) => r.status === "PARTIALLY_DISPENSED").length,
      awaiting: list.filter((r) => r.status === "AWAITING_PAYMENT").length,
    };
  }, [list]);

  const selected = list.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ready" value={stats.ready} accent="ok" />
        <Stat label="Partially Dispensed" value={stats.partial} accent="warn" />
        <Stat label="Awaiting Payment" value={stats.awaiting} />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{list.length} prescriptions</p>
        {queueQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {queueQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
            </div>
          ) : list.length === 0 ? (
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
                  <tr
                    key={rx.id}
                    onClick={() => setSelectedId(rx.id)}
                    className={`table-row-interactive ${selectedId === rx.id ? "bg-muted/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{rx.patientName || "Walk-in"}</p>
                      <p className="patient-id mt-0.5">{rx.patientPublicId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">
                        {rx.lines.length} item{rx.lines.length === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rx.lines
                          .slice(0, 2)
                          .map((l) => `${l.drugName}${l.strength ? " " + l.strength : ""}`)
                          .join(", ")}
                        {rx.lines.length > 2 ? "…" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{rx.prescribedByName}</td>
                    <td className="px-4 py-3">
                      <RxStatusPill status={rx.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
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

function DispensePanel({ rx, onClose }: { rx: PrescriptionDto; onClose: () => void }) {
  const qc = useQueryClient();

  const dispenseMut = useMutation({
    mutationFn: (payload: DispensePayload) => clinicalService.dispensePrescription(rx.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Dispensed and recorded in patient folder");
      onClose();
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not dispense");
    },
  });

  const markReadyMut = useMutation({
    mutationFn: () => clinicalService.updatePrescriptionStatus(rx.id, "READY"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Marked ready for dispense");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not update status");
    },
  });

  const [qty, setQty] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    rx.lines.forEach((l) => {
      m[l.id] = String(Math.max(0, Number(l.quantity) - Number(l.dispensedQty)));
    });
    return m;
  });
  const [notes, setNotes] = useState(rx.pharmacyNotes ?? "");

  const allDispensable = rx.lines.every(
    (l) => l.status === "READY" || l.status === "PARTIALLY_DISPENSED" || l.status === "DISPENSED" || l.status === "CANCELLED",
  );

  function handleDispense() {
    const lines: DispenseLineInput[] = [];
    rx.lines.forEach((l) => {
      const want = parseInt(qty[l.id] ?? "0") || 0;
      if (want <= 0) return;
      const remaining = Math.max(0, Number(l.quantity) - Number(l.dispensedQty));
      const dispenseQty = Math.min(want, remaining);
      if (dispenseQty <= 0) return;
      lines.push({ lineId: l.id, quantity: dispenseQty });
    });
    if (lines.length === 0) {
      toast.error("Enter quantity to dispense for at least one line");
      return;
    }
    dispenseMut.mutate({ lines, pharmacyNotes: notes.trim() || undefined });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dispense Prescription</CardTitle>
        <CardDescription>
          {rx.id.slice(0, 8)}… · {rx.prescribedAt ? formatDateTime(rx.prescribedAt) : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Patient context (limited)
          </p>
          <p className="mt-1 font-medium text-foreground">{rx.patientName || "Walk-in"}</p>
          <p className="patient-id">{rx.patientPublicId}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3" /> Full clinical folder is restricted to
            clinicians.
          </p>
        </div>

        <DataRow label="Prescribed by" value={rx.prescribedByName} />
        <DataRow label="Items" value={String(rx.lines.length)} />
        <DataRow label="Status" value={rx.status.replace(/_/g, " ").toLowerCase()} />

        <Separator />

        <div className="space-y-2">
          {rx.lines.map((l) => {
            const remaining = Math.max(0, Number(l.quantity) - Number(l.dispensedQty));
            return (
              <div key={l.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {l.drugName} {l.strength}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[l.form, l.route, l.frequency, l.durationDays ? `${l.durationDays}d` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {l.instructions && (
                      <p className="mt-1 text-xs italic text-foreground">{l.instructions}</p>
                    )}
                  </div>
                  <span className="patient-id shrink-0">
                    {Number(l.dispensedQty)}/{Number(l.quantity)}
                  </span>
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
                    disabled={
                      remaining === 0 ||
                      l.status === "PENDING" ||
                      l.status === "CANCELLED" ||
                      l.status === "DISPENSED"
                    }
                  />
                  <span className="text-xs text-muted-foreground">of {remaining} remaining</span>
                  <span className="ml-auto text-xs text-muted-foreground">{l.payerType}</span>
                </div>
              </div>
            );
          })}
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Counselling / out-of-stock notes…"
        />

        <div className="flex flex-col gap-2">
          <Button onClick={handleDispense} disabled={!allDispensable || dispenseMut.isPending}>
            {dispenseMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Dispense &amp; Record
          </Button>
          {rx.status === "AWAITING_PAYMENT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markReadyMut.mutate()}
              disabled={markReadyMut.isPending}
            >
              {markReadyMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-1.5 h-4 w-4" />
              )}
              Mark Ready (cashier confirmed payment)
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Manual dispense view ──────────────────────────────────────────────

function DispenseView() {
  const [query, setQuery] = useState("");

  const allQuery = useQuery({
    queryKey: [...queryKeys.clinical.pharmacyQueue, "ALL"],
    queryFn: () => clinicalService.pharmacyWorklist(),
  });

  const matched = useMemo(() => {
    const list = allQuery.data ?? [];
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return list.filter(
      (rx) =>
        rx.id.toLowerCase().includes(q) ||
        (rx.patientPublicId ?? "").toLowerCase().includes(q) ||
        (rx.patientName ?? "").toLowerCase().includes(q),
    );
  }, [allQuery.data, query]);

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
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="GH-2026-XXXXX or RX-XXXXX or name…"
            className="font-clinical"
          />
          {allQuery.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading prescriptions…
            </p>
          )}
          {!allQuery.isLoading && query && matched.length === 0 && (
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
                  <p className="font-medium">{rx.patientName || "Walk-in"}</p>
                  <p className="patient-id mt-0.5">
                    {rx.patientPublicId} · {rx.id.slice(0, 8)}…
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rx.lines.length} items · {rx.status.replace(/_/g, " ").toLowerCase()}
                  </p>
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
      <p className="text-xs text-muted-foreground">
        Mock inventory — pharmacy stock module is queued for a later phase.
      </p>
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
                <td className="px-4 py-3 text-right font-clinical text-muted-foreground">
                  {d.reorderAt}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`status-pill text-xs ${d.stock <= d.reorderAt ? "status-pill-inactive" : "status-pill-active"}`}
                  >
                    {d.stock <= d.reorderAt ? (
                      <>
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        Low Stock
                      </>
                    ) : (
                      "Adequate"
                    )}
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

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function RxStatusPill({ status }: { status: PrescriptionStatus }) {
  const cls =
    status === "DISPENSED"
      ? "status-pill-active"
      : status === "PARTIALLY_DISPENSED"
        ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
        : status === "CANCELLED"
          ? "status-pill-inactive"
          : "status-pill-pending";
  return (
    <span className={`status-pill text-xs ${cls}`}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "warn" | "ok" | "info";
}) {
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
