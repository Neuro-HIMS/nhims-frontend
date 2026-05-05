"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FlaskConical, Save, ShieldCheck } from "lucide-react";
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
import type { LabOrder, LabOrderStatus, LabResultRow } from "@/lib/clinical-types";

const SUB_NAV = [
  { label: "Worklist", view: "worklist", href: "/laboratory?view=worklist" },
  { label: "Result Entry", view: "results", href: "/laboratory?view=results" },
  { label: "Completed Today", view: "done", href: "/laboratory?view=done" },
];

export function LaboratoryWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "worklist";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Laboratory</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Process test requests and authorise results. You see only the orders assigned to your station -
          patient folders are restricted to clinicians.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/laboratory" />
      <div className="pt-2">
        {view === "worklist" && <WorklistView />}
        {view === "results" && <ResultEntryView />}
        {view === "done" && <CompletedView />}
      </div>
    </div>
  );
}

const ACTIVE_STATUSES: LabOrderStatus[] = ["ordered", "awaiting-payment", "awaiting-sample", "in-progress"];

// ── Worklist ──────────────────────────────────────────────────────────

function WorklistView() {
  const orders = useEncountersStore((s) => s.labOrders);
  const billing = useEncountersStore((s) => s.billing);
  const setStatus = useEncountersStore((s) => s.setLabOrderStatus);

  const [filter, setFilter] = useState<"active" | "all" | LabOrderStatus>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders
      .filter((o) =>
        filter === "all"
          ? true
          : filter === "active"
          ? ACTIVE_STATUSES.includes(o.status)
          : o.status === filter
      )
      .sort((a, b) => urgencyRank(a) - urgencyRank(b) || a.orderedAt.localeCompare(b.orderedAt));
  }, [orders, filter]);

  const selected = filtered.find((o) => o.id === selectedId) ?? null;
  const billingForSelected = selected ? billing.find((b) => b.sourceRef === selected.id) : null;

  function start(id: string) {
    setStatus(id, "in-progress");
    toast.success("Order moved to In Progress");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Pending" value={orders.filter((o) => o.status === "ordered" || o.status === "awaiting-sample").length} />
        <Stat label="In Progress" value={orders.filter((o) => o.status === "in-progress").length} accent="info" />
        <Stat label="STAT/Urgent" value={orders.filter((o) => ACTIVE_STATUSES.includes(o.status) && o.urgency !== "routine").length} accent="warn" />
        <Stat label="Completed Today" value={orders.filter((o) => o.status === "completed" && isToday(o.resultEnteredAt)).length} accent="ok" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active orders</SelectItem>
            <SelectItem value="ordered">Ordered (new)</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filtered.length} orders</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FlaskConical className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No orders in this view.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Patient</Th>
                  <Th>Test</Th>
                  <Th>Ordered By</Th>
                  <Th>Urgency</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`table-row-interactive ${selectedId === o.id ? "bg-muted/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.patientName}</p>
                      <p className="patient-id mt-0.5">{o.patientId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{o.testName}</p>
                      <p className="text-xs text-muted-foreground">{o.category}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.orderedBy}</td>
                    <td className="px-4 py-3"><UrgencyPill urgency={o.urgency} /></td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selected.testName}</CardTitle>
              <CardDescription>{selected.category}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient context (limited)</p>
                <p className="mt-1 font-medium text-foreground">{selected.patientName}</p>
                <p className="patient-id">{selected.patientId} · {selected.patientSex} · {calculateAge(selected.patientDob)}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  Full clinical folder is restricted to nurses and clinicians.
                </p>
              </div>

              <DataRow label="Order ID" value={selected.id} mono />
              <DataRow label="Ordered by" value={selected.orderedBy} />
              <DataRow label="Ordered at" value={formatDateTime(selected.orderedAt)} />
              <DataRow label="Urgency" value={selected.urgency.toUpperCase()} />
              <DataRow label="Fee" value={`GHS ${selected.fee.toFixed(2)}`} mono />
              {billingForSelected && (
                <DataRow
                  label="Billing"
                  value={`${billingForSelected.status} · ${billingForSelected.sponsor}`}
                />
              )}

              {selected.clinicalNotes && (
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinical question</p>
                  <p className="mt-1 text-foreground">{selected.clinicalNotes}</p>
                </div>
              )}

              <Separator />

              <div className="flex flex-col gap-2">
                {selected.status === "ordered" && (
                  <Button onClick={() => start(selected.id)}>
                    <FlaskConical className="mr-1.5 h-4 w-4" /> Start Processing
                  </Button>
                )}
                {(selected.status === "in-progress" || selected.status === "ordered") && (
                  <Button variant="outline" onClick={() => {
                    const u = new URL(window.location.href);
                    u.searchParams.set("view", "results");
                    u.searchParams.set("orderId", selected.id);
                    window.history.pushState(null, "", u.toString());
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}>
                    Enter Results
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <FlaskConical className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select an order to view its task ticket</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Result entry ──────────────────────────────────────────────────────

const RESULT_TEMPLATES: Record<string, { analyte: string; refRange: string; unit: string }[]> = {
  FBC: [
    { analyte: "Haemoglobin", refRange: "12.0-17.5", unit: "g/dL" },
    { analyte: "WBC", refRange: "4.0-11.0", unit: "x10^3/uL" },
    { analyte: "Platelets", refRange: "150-400", unit: "x10^3/uL" },
    { analyte: "PCV", refRange: "36-54", unit: "%" },
  ],
  MAL: [
    { analyte: "Malaria RDT", refRange: "Negative", unit: "" },
    { analyte: "Species", refRange: "—", unit: "" },
  ],
  FBG: [
    { analyte: "Fasting Glucose", refRange: "3.9-5.6", unit: "mmol/L" },
  ],
  UMC: [
    { analyte: "Appearance", refRange: "Clear", unit: "" },
    { analyte: "WBC (microscopy)", refRange: "<5", unit: "/HPF" },
    { analyte: "Organism", refRange: "—", unit: "" },
  ],
  HBA: [{ analyte: "HbA1c", refRange: "<5.7", unit: "%" }],
  LFT: [
    { analyte: "ALT", refRange: "7-56", unit: "U/L" },
    { analyte: "AST", refRange: "10-40", unit: "U/L" },
    { analyte: "ALP", refRange: "44-147", unit: "U/L" },
    { analyte: "Total Bilirubin", refRange: "0.1-1.2", unit: "mg/dL" },
  ],
  RFT: [
    { analyte: "Urea", refRange: "2.5-7.5", unit: "mmol/L" },
    { analyte: "Creatinine", refRange: "60-110", unit: "umol/L" },
    { analyte: "eGFR", refRange: ">90", unit: "mL/min" },
  ],
  ECG: [{ analyte: "Findings", refRange: "—", unit: "" }],
};

function ResultEntryView() {
  const orders = useEncountersStore((s) => s.labOrders);
  const submitResult = useEncountersStore((s) => s.submitLabResult);
  const setStatus = useEncountersStore((s) => s.setLabOrderStatus);
  const user = useAuthStore((s) => s.user);
  const userLabel = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Lab Officer";

  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId") ?? "";

  const eligible = useMemo(
    () => orders.filter((o) => o.status === "ordered" || o.status === "in-progress").sort((a, b) => urgencyRank(a) - urgencyRank(b)),
    [orders]
  );

  const [orderId, setOrderId] = useState(initialOrderId || eligible[0]?.id || "");
  const order = orders.find((o) => o.id === orderId) ?? null;
  const template = order ? RESULT_TEMPLATES[order.testCode] ?? [{ analyte: order.testName, refRange: "—", unit: "" }] : [];

  const [rows, setRows] = useState<Record<string, { value: string; flag: LabResultRow["flag"] }>>({});
  const [summary, setSummary] = useState("");

  function update(analyte: string, key: "value" | "flag", val: string) {
    setRows((prev) => ({ ...prev, [analyte]: { ...(prev[analyte] ?? { value: "", flag: "normal" }), [key]: val as LabResultRow["flag"] } }));
  }

  function submit() {
    if (!order) return;
    const results: LabResultRow[] = template.map((t) => ({
      analyte: t.analyte,
      refRange: t.refRange,
      unit: t.unit,
      value: rows[t.analyte]?.value ?? "",
      flag: rows[t.analyte]?.flag ?? "normal",
    }));
    if (results.every((r) => !r.value.trim())) {
      toast.error("Enter at least one result before authorising");
      return;
    }
    submitResult(order.id, results, summary.trim(), userLabel);
    toast.success("Results authorised - clinician will see them in the patient folder");
    setRows({});
    setSummary("");
    setOrderId("");
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <FlaskConical className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No active orders to enter results for.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enter Test Results</CardTitle>
        <CardDescription>Select an order and capture the result. Submitting authorises and closes the request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Select Lab Order</label>
          <Select value={orderId} onValueChange={(v) => { setOrderId(v); setRows({}); setSummary(""); if (v) setStatus(v, "in-progress"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {eligible.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.patientName} - {o.testName} ({o.urgency})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium text-foreground">{order.testName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Patient: {order.patientName} ({order.patientId}, {order.patientSex}, {calculateAge(order.patientDob)}) · ordered by {order.orderedBy}
          </p>
          {order.clinicalNotes && <p className="mt-2 text-foreground">Question: {order.clinicalNotes}</p>}
          <p className="mt-2 text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline h-3 w-3" /> No folder access from this station.</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Analyte</th>
              <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ref. Range</th>
              <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Unit</th>
              <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Result</th>
              <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {template.map((t) => {
              const r = rows[t.analyte];
              return (
                <tr key={t.analyte} className={r?.flag === "critical" ? "bg-[hsl(var(--clinical-emergency-bg))]" : ""}>
                  <td className="py-2.5 font-medium text-foreground">{t.analyte}</td>
                  <td className="py-2.5 font-clinical text-xs text-muted-foreground">{t.refRange}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{t.unit}</td>
                  <td className="py-2.5">
                    <Input value={r?.value ?? ""} onChange={(e) => update(t.analyte, "value", e.target.value)} className="h-8 w-32 font-clinical text-sm" placeholder="—" />
                  </td>
                  <td className="py-2.5">
                    <Select value={r?.flag ?? "normal"} onValueChange={(v) => update(t.analyte, "flag", v)}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Comment / Interpretation</label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Optional comment for the clinician…" />
        </div>

        <div className="flex justify-end">
          <Button onClick={submit}>
            <Save className="mr-1.5 h-4 w-4" /> Authorise & Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Completed view ────────────────────────────────────────────────────

function CompletedView() {
  const orders = useEncountersStore((s) => s.labOrders);
  const completed = orders.filter((o) => o.status === "completed").sort((a, b) => (b.resultEnteredAt ?? "").localeCompare(a.resultEnteredAt ?? ""));

  if (completed.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <FlaskConical className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No completed reports yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <Th>Reported</Th>
            <Th>Patient</Th>
            <Th>Test</Th>
            <Th>By</Th>
            <Th>Critical?</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {completed.map((o) => {
            const hasCritical = o.results?.some((r) => r.flag === "critical");
            return (
              <tr key={o.id}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.resultEnteredAt ? formatDateTime(o.resultEnteredAt) : "—"}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{o.patientName}</p>
                  <p className="patient-id mt-0.5">{o.patientId}</p>
                </td>
                <td className="px-4 py-2.5">{o.testName}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.resultEnteredBy}</td>
                <td className="px-4 py-2.5">
                  {hasCritical ? (
                    <span className="status-pill text-xs bg-[hsl(var(--clinical-emergency))] text-white">Critical</span>
                  ) : (
                    <span className="status-pill text-xs status-pill-active">Normal</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function urgencyRank(o: LabOrder): number {
  return o.urgency === "stat" ? 0 : o.urgency === "urgent" ? 1 : 2;
}

function isToday(iso: string | undefined) {
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

function UrgencyPill({ urgency }: { urgency: LabOrder["urgency"] }) {
  return (
    <span className={`status-pill text-xs ${urgency === "stat" ? "bg-[hsl(var(--clinical-emergency))] text-white" : urgency === "urgent" ? "bg-[hsl(var(--clinical-urgent))] text-white" : "status-pill-pending"}`}>
      {urgency === "stat" ? "STAT" : urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

function StatusPill({ status }: { status: LabOrderStatus }) {
  const cls =
    status === "completed"
      ? "status-pill-active"
      : status === "in-progress"
      ? "bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
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
      : accent === "info"
      ? "border-[hsl(var(--notice-info-border))] bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
      : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-clinical text-2xl font-semibold">{value}</p>
    </div>
  );
}
