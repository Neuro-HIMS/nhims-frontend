"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FlaskConical, Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
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
import type { LabOrderDto, LabOrderStatus, SubmitLabResultsPayload } from "@/types/clinical.types";

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
          Process test requests and authorise results. You see only the orders assigned to your station —
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

const ACTIVE_STATUSES: LabOrderStatus[] = ["ORDERED", "PAID", "CLAIMED", "IN_PROGRESS"];

// ── Worklist ──────────────────────────────────────────────────────────

function WorklistView() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"READY" | "all" | LabOrderStatus>("READY");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const worklistQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, filter],
    queryFn: () =>
      clinicalService.labWorklist(filter === "all" ? undefined : filter === "READY" ? "READY" : filter),
    refetchInterval: 30_000,
  });

  const startMut = useMutation({
    mutationFn: (id: string) => clinicalService.updateLabOrderStatus(id, "IN_PROGRESS"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Order moved to In Progress");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not start order");
    },
  });

  const orders = worklistQuery.data ?? [];
  const sorted = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          urgencyRank(a) - urgencyRank(b) ||
          (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""),
      ),
    [orders],
  );

  const selected = sorted.find((o) => o.id === selectedId) ?? null;

  const stats = useMemo(() => {
    return {
      pending: orders.filter((o) => o.status === "ORDERED" || o.status === "PAID" || o.status === "CLAIMED").length,
      inProgress: orders.filter((o) => o.status === "IN_PROGRESS").length,
      stat: orders.filter((o) => ACTIVE_STATUSES.includes(o.status) && o.priority !== "ROUTINE").length,
      done: orders.filter((o) => o.status === "AUTHORISED" || o.status === "COMPLETED").length,
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Pending" value={stats.pending} />
        <Stat label="In Progress" value={stats.inProgress} accent="info" />
        <Stat label="STAT/Urgent" value={stats.stat} accent="warn" />
        <Stat label="Reported" value={stats.done} accent="ok" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="READY">Ready (paid/claimed)</SelectItem>
            <SelectItem value="ORDERED">Ordered (awaiting payment)</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="COMPLETED">Completed (unauthorised)</SelectItem>
            <SelectItem value="AUTHORISED">Authorised</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{sorted.length} orders</p>
        {worklistQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {worklistQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading worklist…
            </div>
          ) : sorted.length === 0 ? (
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
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`table-row-interactive ${selectedId === o.id ? "bg-muted/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.patientName}</p>
                      <p className="patient-id mt-0.5">{o.patientPublicId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{o.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{o.serviceCode}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.orderedByName}</td>
                    <td className="px-4 py-3">
                      <UrgencyPill priority={o.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.status} />
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selected.serviceName}</CardTitle>
              <CardDescription>{selected.serviceCode}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient context (limited)
                </p>
                <p className="mt-1 font-medium text-foreground">{selected.patientName}</p>
                <p className="patient-id">{selected.patientPublicId}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  Full clinical folder is restricted to nurses and clinicians.
                </p>
              </div>

              <DataRow label="Order ID" value={selected.id} mono />
              <DataRow label="Ordered by" value={selected.orderedByName} />
              <DataRow label="Ordered at" value={selected.orderedAt ? formatDateTime(selected.orderedAt) : "—"} />
              <DataRow label="Priority" value={selected.priority} />
              <DataRow label="Payer" value={selected.payerType} />
              <DataRow label="Status" value={selected.status} />

              {selected.reason && (
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Clinical question
                  </p>
                  <p className="mt-1 text-foreground">{selected.reason}</p>
                </div>
              )}

              <Separator />

              <div className="flex flex-col gap-2">
                {(selected.status === "ORDERED" || selected.status === "PAID" || selected.status === "CLAIMED") && (
                  <Button onClick={() => startMut.mutate(selected.id)} disabled={startMut.isPending}>
                    <FlaskConical className="mr-1.5 h-4 w-4" /> Start Processing
                  </Button>
                )}
                {(selected.status === "IN_PROGRESS" ||
                  selected.status === "PAID" ||
                  selected.status === "CLAIMED" ||
                  selected.status === "ORDERED") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const u = new URL(window.location.href);
                      u.searchParams.set("view", "results");
                      u.searchParams.set("orderId", selected.id);
                      window.history.pushState(null, "", u.toString());
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                  >
                    Enter Results
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
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

interface RowDraft {
  analyte: string;
  value: string;
  units: string;
  referenceRange: string;
  flag: string;
  comment: string;
}

function blankRow(): RowDraft {
  return { analyte: "", value: "", units: "", referenceRange: "", flag: "", comment: "" };
}

function ResultEntryView() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId") ?? "";

  const eligibleQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "READY+IN_PROGRESS"],
    queryFn: async () => {
      // Fetch ready and in-progress in parallel and merge.
      const [ready, inProgress] = await Promise.all([
        clinicalService.labWorklist("READY"),
        clinicalService.labWorklist("IN_PROGRESS"),
      ]);
      const seen = new Set<string>();
      const all = [...ready, ...inProgress];
      return all.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
    },
  });

  const submitMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitLabResultsPayload }) =>
      clinicalService.submitLabResults(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Results authorised — clinician will see them in the patient folder");
      setOrderId("");
      setRows([blankRow()]);
      setSummary("");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not submit results");
    },
  });

  const eligible = eligibleQuery.data ?? [];
  const [orderId, setOrderId] = useState(initialOrderId || "");
  useEffect(() => {
    if (!orderId && eligible[0]) setOrderId(eligible[0].id);
  }, [orderId, eligible]);

  const order = eligible.find((o) => o.id === orderId) ?? null;
  const [rows, setRows] = useState<RowDraft[]>([blankRow()]);
  const [summary, setSummary] = useState("");

  function update(idx: number, key: keyof RowDraft, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }
  function removeRow(idx: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function submit() {
    if (!order) return;
    const cleaned = rows.filter((r) => r.analyte.trim() && r.value.trim());
    if (cleaned.length === 0) {
      toast.error("Enter at least one analyte + value before authorising");
      return;
    }
    const payload: SubmitLabResultsPayload = {
      rows: cleaned.map((r) => ({
        analyte: r.analyte.trim(),
        value: r.value.trim(),
        units: r.units.trim(),
        referenceRange: r.referenceRange.trim(),
        flag: r.flag.trim(),
        comment: summary.trim() || r.comment.trim(),
      })),
      authoriseImmediately: true,
    };
    submitMut.mutate({ id: order.id, payload });
  }

  if (eligibleQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading ready orders…
        </CardContent>
      </Card>
    );
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
        <CardDescription>
          Select an order, capture the result rows, and authorise. Authorising returns the patient to the doctor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Select Lab Order</label>
          <Select
            value={orderId}
            onValueChange={(v) => {
              setOrderId(v);
              setRows([blankRow()]);
              setSummary("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.patientName} — {o.serviceName} ({o.priority})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium text-foreground">{order.serviceName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Patient: {order.patientName} ({order.patientPublicId}) · ordered by {order.orderedByName}
          </p>
          {order.reason && <p className="mt-2 text-foreground">Question: {order.reason}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3" /> No folder access from this station.
          </p>
        </div>

        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="grid items-end gap-2 sm:grid-cols-[1.4fr_1fr_0.7fr_1fr_0.7fr_auto]">
              <Input
                placeholder="Analyte"
                value={r.analyte}
                onChange={(e) => update(idx, "analyte", e.target.value)}
              />
              <Input
                placeholder="Value"
                value={r.value}
                onChange={(e) => update(idx, "value", e.target.value)}
                className="font-clinical"
              />
              <Input
                placeholder="Units"
                value={r.units}
                onChange={(e) => update(idx, "units", e.target.value)}
              />
              <Input
                placeholder="Ref range"
                value={r.referenceRange}
                onChange={(e) => update(idx, "referenceRange", e.target.value)}
              />
              <Select value={r.flag || "OK"} onValueChange={(v) => update(idx, "flag", v === "OK" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, blankRow()])}>
            <Plus className="mr-1.5 h-4 w-4" /> Add row
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Comment / Interpretation</label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="Optional comment for the clinician…"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitMut.isPending}>
            {submitMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Authorise & Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Completed view ────────────────────────────────────────────────────

function CompletedView() {
  const completedQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "AUTHORISED"],
    queryFn: () => clinicalService.labWorklist("AUTHORISED"),
  });

  const completed = useMemo(
    () =>
      [...(completedQuery.data ?? [])]
        .filter((o) => isToday(o.authorisedAt) || isToday(o.completedAt))
        .sort((a, b) => (b.authorisedAt ?? b.completedAt ?? "").localeCompare(a.authorisedAt ?? a.completedAt ?? "")),
    [completedQuery.data],
  );

  if (completedQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading completed reports…
        </CardContent>
      </Card>
    );
  }

  if (completed.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <FlaskConical className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No completed reports yet today.</p>
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
            const hasCritical = o.results.some((r) => (r.flag ?? "").toUpperCase() === "CRITICAL");
            const reportedAt = o.authorisedAt ?? o.completedAt;
            return (
              <tr key={o.id}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {reportedAt ? formatDateTime(reportedAt) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{o.patientName}</p>
                  <p className="patient-id mt-0.5">{o.patientPublicId}</p>
                </td>
                <td className="px-4 py-2.5">{o.serviceName}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {o.results[0]?.recordedByName ?? "—"}
                </td>
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

function urgencyRank(o: LabOrderDto): number {
  return o.priority === "STAT" ? 0 : o.priority === "EMERGENCY" ? 1 : o.priority === "URGENT" ? 2 : 3;
}

function isToday(iso: string | null | undefined) {
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

function UrgencyPill({ priority }: { priority: LabOrderDto["priority"] }) {
  return (
    <span
      className={`status-pill text-xs ${
        priority === "STAT" || priority === "EMERGENCY"
          ? "bg-[hsl(var(--clinical-emergency))] text-white"
          : priority === "URGENT"
          ? "bg-[hsl(var(--clinical-urgent))] text-white"
          : "status-pill-pending"
      }`}
    >
      {priority}
    </span>
  );
}

function StatusPill({ status }: { status: LabOrderStatus }) {
  const cls =
    status === "AUTHORISED" || status === "COMPLETED"
      ? "status-pill-active"
      : status === "IN_PROGRESS"
      ? "bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
      : status === "CANCELLED"
      ? "status-pill-inactive"
      : "status-pill-pending";
  return <span className={`status-pill text-xs ${cls}`}>{status}</span>;
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>
      {children}
    </th>
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
      <p className="font-clinical text-2xl font-semibold">{value}</p>
    </div>
  );
}
