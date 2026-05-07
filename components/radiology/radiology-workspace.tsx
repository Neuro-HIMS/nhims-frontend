"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, Save, ScanLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { calculateAge, formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import { minorToGhs } from "@/components/finance/finance-utils";
import type { RadiologyOrderDto, RadiologyOrderStatus } from "@/types/clinical.types";

const SUB_NAV = [
  { label: "Worklist", view: "worklist", href: "/radiology?view=worklist" },
  { label: "Reports", view: "reports", href: "/radiology?view=reports" },
];

export function RadiologyWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "worklist";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Radiology</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Acquire studies and file reports. Cash-pay imaging unlocks when billing covers the encounter charge (same as
          prescriptions).
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/radiology" />
      <div className="pt-2">
        {view === "worklist" && <WorklistView />}
        {view === "reports" && <ReportsView />}
      </div>
    </div>
  );
}

const ACTIVE_STATUSES: RadiologyOrderStatus[] = ["READY", "IN_PROGRESS", "ORDERED"];

function priorityRank(p: RadiologyOrderDto["priority"]): number {
  if (p === "STAT") return 0;
  if (p === "EMERGENCY") return 1;
  if (p === "URGENT") return 2;
  return 3;
}

function WorklistView() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"active" | "all" | RadiologyOrderStatus>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState("");

  const listQuery = useQuery({
    queryKey: [...queryKeys.clinical.radiologyWorklist, filter],
    queryFn: () =>
      clinicalService.radiologyWorklist(
        filter === "active" ? undefined : filter === "all" ? "ALL" : filter,
      ),
    staleTime: 15_000,
  });

  const orders = listQuery.data ?? [];

  const filtered = useMemo(() => {
    let rows = orders;
    if (filter === "active") {
      rows = rows.filter((o) => ACTIVE_STATUSES.includes(o.status));
    }
    return [...rows].sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""),
    );
  }, [orders, filter]);

  const selected = filtered.find((o) => o.id === selectedId) ?? null;

  const startMut = useMutation({
    mutationFn: () => clinicalService.updateRadiologyOrderStatus(selected!.id, "IN_PROGRESS"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.radiologyWorklist });
      toast.success("Study marked in progress");
    },
    onError: () => toast.error("Could not update study"),
  });

  const reportMut = useMutation({
    mutationFn: () => clinicalService.submitRadiologyReport(selected!.id, report.trim()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.radiologyWorklist });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Report filed");
      setReport("");
      setSelectedId(null);
    },
    onError: () => toast.error("Could not save report"),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting / ordered" value={orders.filter((o) => o.status === "ORDERED").length} />
        <Stat label="Ready + active" value={orders.filter((o) => o.status === "READY" || o.status === "IN_PROGRESS").length} accent="info" />
        <Stat label="Completed" value={orders.filter((o) => o.status === "COMPLETED").length} accent="ok" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active queue</SelectItem>
            <SelectItem value="ORDERED">Ordered (awaiting payment)</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {listQuery.isFetching && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
          {filtered.length} requests
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {listQuery.isLoading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading worklist…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ScanLine className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No requests in this view.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Patient</Th>
                  <Th>Study</Th>
                  <Th>Ordered by</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelectedId(o.id);
                      setReport(o.reportText ?? "");
                    }}
                    className={`table-row-interactive ${selectedId === o.id ? "bg-muted/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.patientName}</p>
                      <p className="patient-id mt-0.5">
                        {o.patientPublicId} · {o.patientSex}
                        {o.patientDob ? ` · ${calculateAge(o.patientDob)}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{o.studyName}</p>
                      <p className="text-xs text-muted-foreground">{o.modality}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.orderedByName}</td>
                    <td className="px-4 py-3">
                      <PriorityPill p={o.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusLabel status={o.status} />
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
              <CardTitle className="text-base">{selected.studyName}</CardTitle>
              <CardDescription>{selected.modality}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient context</p>
                <p className="mt-1 font-medium text-foreground">{selected.patientName}</p>
                <p className="patient-id">
                  {selected.patientPublicId} · {selected.patientSex}
                  {selected.patientDob ? ` · ${calculateAge(selected.patientDob)}` : ""}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1 inline h-3 w-3" /> Full clinical folder remains with authorised roles.
                </p>
              </div>

              <DataRow label="Encounter" value={selected.encounterNumber} mono />
              <DataRow label="Ordered by" value={selected.orderedByName} />
              <DataRow label="Ordered at" value={selected.orderedAt ? formatDateTime(selected.orderedAt) : "—"} />
              <DataRow label="Charge" value={`GH₵ ${minorToGhs(selected.lineTotalMinor)}`} mono />

              {selected.clinicalNotes ? (
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinical notes</p>
                  <p className="mt-1 text-foreground">{selected.clinicalNotes}</p>
                </div>
              ) : null}

              <Separator />

              {selected.status === "READY" && (
                <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
                  {startMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ScanLine className="mr-1.5 h-4 w-4" />}
                  Start acquisition
                </Button>
              )}

              {selected.status === "ORDERED" && (
                <p className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                  Waiting for cashier payment against the encounter bill before imaging can start.
                </p>
              )}

              {selected.status === "IN_PROGRESS" && (
                <>
                  <Textarea
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    rows={6}
                    placeholder="Findings, impression, recommendations…"
                  />
                  <Button onClick={() => reportMut.mutate()} disabled={reportMut.isPending || !report.trim()}>
                    {reportMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    File report
                  </Button>
                </>
              )}

              {selected.status === "COMPLETED" && selected.reportText ? (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Report — {selected.reportedByName}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{selected.reportText}</p>
                </div>
              ) : null}

              <Button variant="ghost" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <ScanLine className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select a request to work it</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReportsView() {
  const completedQuery = useQuery({
    queryKey: [...queryKeys.clinical.radiologyWorklist, "COMPLETED"],
    queryFn: () => clinicalService.radiologyWorklist("COMPLETED"),
    staleTime: 60_000,
  });

  const rows = (completedQuery.data ?? []).sort(
    (a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
  );

  if (completedQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ScanLine className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No completed studies yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <Th>Completed</Th>
            <Th>Patient</Th>
            <Th>Study</Th>
            <Th>Radiologist</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                {o.completedAt ? formatDateTime(o.completedAt) : "—"}
              </td>
              <td className="px-4 py-2.5">
                <p className="font-medium">{o.patientName}</p>
                <p className="patient-id mt-0.5">{o.patientPublicId}</p>
              </td>
              <td className="px-4 py-2.5">{o.studyName}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.reportedByName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-sm font-medium text-foreground ${mono ? "font-clinical" : ""}`}>{value}</span>
    </div>
  );
}

function PriorityPill({ p }: { p: RadiologyOrderDto["priority"] }) {
  const heavy = p === "STAT" || p === "EMERGENCY";
  return (
    <span
      className={`status-pill text-xs ${heavy ? "bg-[hsl(var(--clinical-urgent))] text-white" : "status-pill-pending"}`}
    >
      {p}
    </span>
  );
}

function StatusLabel({ status }: { status: RadiologyOrderStatus }) {
  const label =
    status === "ORDERED"
      ? "Awaiting payment"
      : status === "READY"
      ? "Ready"
      : status === "IN_PROGRESS"
      ? "In progress"
      : status === "COMPLETED"
      ? "Completed"
      : status === "CANCELLED"
      ? "Cancelled"
      : status;
  const cls =
    status === "COMPLETED"
      ? "status-pill-active"
      : status === "IN_PROGRESS"
      ? "bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
      : status === "CANCELLED"
      ? "status-pill-inactive"
      : "status-pill-pending";
  return <span className={`status-pill text-xs ${cls}`}>{label}</span>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
