"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LaboratoryCatalogSetupView } from "@/components/laboratory/laboratory-catalog-setup";
import { LaboratoryPatientLabsView } from "@/components/laboratory/lab-patient-labs-view";
import { LabResultEntryView } from "@/components/laboratory/lab-result-entry-view";
import { LaboratorySearchView } from "@/components/laboratory/laboratory-search-view";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type { LabOrderDto, LabOrderStatus } from "@/types/clinical.types";

const SUB_NAV = [
  { label: "Worklist", view: "worklist", href: "/laboratory?view=worklist" },
  { label: "Patient search", view: "search", href: "/laboratory?view=search" },
  { label: "Result entry", view: "results", href: "/laboratory?view=results" },
  { label: "Completed today", view: "done", href: "/laboratory?view=done" },
  { label: "Catalog & setup", view: "catalog", href: "/laboratory?view=catalog" },
];

export function LaboratoryWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "worklist";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Laboratory</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Process test requests and authorise results. Charges post to the encounter bill — patients settle at billing.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/laboratory" />
      <div className="pt-2">
        {view === "worklist" && <WorklistView />}
        {view === "search" && <LaboratorySearchView />}
        {view === "patient-labs" && <LaboratoryPatientLabsView />}
        {view === "results" && <LabResultEntryView />}
        {view === "done" && <CompletedView />}
        {view === "catalog" && <LaboratoryCatalogSetupView />}
      </div>
    </div>
  );
}

const ACTIVE_STATUSES: LabOrderStatus[] = ["ORDERED", "PAID", "CLAIMED", "IN_PROGRESS"];

function WorklistView() {
  const router = useRouter();
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
          urgencyRank(a) - urgencyRank(b) || (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""),
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

  const canStart =
    selected &&
    (selected.status === "ORDERED" || selected.status === "PAID" || selected.status === "CLAIMED");
  const canEnterResults =
    selected &&
    (selected.status === "ORDERED" ||
      selected.status === "PAID" ||
      selected.status === "CLAIMED" ||
      selected.status === "IN_PROGRESS");

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
          <SelectTrigger className="min-w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="READY">Ready queue (includes unpaid — bill line open)</SelectItem>
            <SelectItem value="ORDERED">Ordered only</SelectItem>
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

              {selected.provisionalDiagnosisLabel ? (
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnosis snapshot</p>
                  <p className="mt-1 text-foreground">{selected.provisionalDiagnosisLabel}</p>
                </div>
              ) : null}

              {selected.reason && (
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Clinical question
                  </p>
                  <p className="mt-1 text-foreground">{selected.reason}</p>
                </div>
              )}

              <Separator />

              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                The lab fee is added to the encounter bill. Billing clears payment — you may collect and process the sample
                without waiting for cashier confirmation.
              </p>

              <div className="flex flex-col gap-2">
                {canStart && (
                  <Button onClick={() => startMut.mutate(selected.id)} disabled={startMut.isPending}>
                    <FlaskConical className="mr-1.5 h-4 w-4" /> Start processing
                  </Button>
                )}
                {canEnterResults && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/laboratory?view=results&orderId=${encodeURIComponent(selected.id)}`)
                    }
                  >
                    Enter results
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
    <th
      className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}
    >
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
