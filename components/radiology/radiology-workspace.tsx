"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Save, ScanLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth.store";
import { useEncountersStore } from "@/store/encounters.store";
import { calculateAge, formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { RadiologyOrder, RadiologyOrderStatus } from "@/lib/clinical-types";

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
          Acquire studies and report findings. You see only the imaging requests assigned to your station.
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

const ACTIVE: RadiologyOrderStatus[] = ["ordered", "awaiting-payment", "scheduled", "in-progress"];

function WorklistView() {
  const orders = useEncountersStore((s) => s.radiologyOrders);
  const setStatus = useEncountersStore((s) => s.setRadiologyStatus);
  const submitReport = useEncountersStore((s) => s.submitRadiologyReport);
  const billing = useEncountersStore((s) => s.billing);
  const user = useAuthStore((s) => s.user);
  const userLabel = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Radiographer";

  const [filter, setFilter] = useState<"active" | "all" | RadiologyOrderStatus>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState("");

  const list = useMemo(
    () =>
      orders
        .filter((o) => (filter === "all" ? true : filter === "active" ? ACTIVE.includes(o.status) : o.status === filter))
        .sort((a, b) => urgencyRank(a) - urgencyRank(b) || a.orderedAt.localeCompare(b.orderedAt)),
    [orders, filter]
  );

  const selected = list.find((o) => o.id === selectedId) ?? null;
  const billingForSelected = selected ? billing.find((b) => b.sourceRef === selected.id) : null;
  const allPaid = billingForSelected ? ["paid", "claimed", "waived"].includes(billingForSelected.status) : true;

  function start(id: string) {
    setStatus(id, "in-progress");
    toast.success("Order moved to In Progress");
  }

  function submit() {
    if (!selected) return;
    if (!report.trim()) {
      toast.error("Report text is required");
      return;
    }
    submitReport(selected.id, report.trim(), userLabel);
    toast.success("Report finalised - clinician will see it in folder");
    setReport("");
    setSelectedId(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={orders.filter((o) => o.status === "ordered" || o.status === "scheduled").length} />
        <Stat label="In Progress" value={orders.filter((o) => o.status === "in-progress").length} accent="info" />
        <Stat label="Reported" value={orders.filter((o) => o.status === "reported").length} accent="ok" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ordered">Ordered (new)</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{list.length} requests</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {list.length === 0 ? (
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
                  <Th>Ordered By</Th>
                  <Th>Urgency</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((o) => (
                  <tr key={o.id} onClick={() => { setSelectedId(o.id); setReport(o.reportText ?? ""); }} className={`table-row-interactive ${selectedId === o.id ? "bg-muted/60" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.patientName}</p>
                      <p className="patient-id mt-0.5">{o.patientId} · {o.patientSex} · {calculateAge(o.patientDob)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{o.studyName}</p>
                      <p className="text-xs text-muted-foreground">{o.modality}</p>
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
              <CardTitle className="text-base">{selected.studyName}</CardTitle>
              <CardDescription>{selected.modality}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient context (limited)</p>
                <p className="mt-1 font-medium text-foreground">{selected.patientName}</p>
                <p className="patient-id">{selected.patientId} · {selected.patientSex} · {calculateAge(selected.patientDob)}</p>
                <p className="mt-2 text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline h-3 w-3" /> Folder restricted to clinicians.</p>
              </div>

              <DataRow label="Order ID" value={selected.id} mono />
              <DataRow label="Ordered by" value={selected.orderedBy} />
              <DataRow label="Ordered at" value={formatDateTime(selected.orderedAt)} />
              <DataRow label="Urgency" value={selected.urgency.toUpperCase()} />
              <DataRow label="Fee" value={`GHS ${selected.fee.toFixed(2)}`} mono />
              {billingForSelected && (
                <DataRow label="Billing" value={`${billingForSelected.status} · ${billingForSelected.sponsor}`} />
              )}

              {selected.clinicalNotes && (
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinical question</p>
                  <p className="mt-1 text-foreground">{selected.clinicalNotes}</p>
                </div>
              )}

              <Separator />

              {selected.status === "ordered" && (
                <Button onClick={() => start(selected.id)} disabled={!allPaid}>
                  <ScanLine className="mr-1.5 h-4 w-4" /> {allPaid ? "Start Acquisition" : "Awaiting payment"}
                </Button>
              )}

              {(selected.status === "in-progress" || selected.status === "scheduled" || selected.status === "ordered") && (
                <>
                  <Textarea value={report} onChange={(e) => setReport(e.target.value)} rows={6} placeholder="Findings, impression, recommendations…" />
                  <Button onClick={submit} disabled={!report.trim() || !allPaid}>
                    <Save className="mr-1.5 h-4 w-4" /> Finalise Report
                  </Button>
                </>
              )}

              {selected.reportText && selected.status === "reported" && (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Report - {selected.reportedBy}</p>
                  <p className="mt-1 whitespace-pre-line">{selected.reportText}</p>
                </div>
              )}

              <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <ScanLine className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select a request to view its task ticket</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReportsView() {
  const orders = useEncountersStore((s) => s.radiologyOrders);
  const reported = orders.filter((o) => o.status === "reported").sort((a, b) => (b.reportedAt ?? "").localeCompare(a.reportedAt ?? ""));

  if (reported.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ScanLine className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No reports finalised yet.</p>
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
            <Th>Study</Th>
            <Th>By</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reported.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.reportedAt ? formatDateTime(o.reportedAt) : "—"}</td>
              <td className="px-4 py-2.5">
                <p className="font-medium">{o.patientName}</p>
                <p className="patient-id mt-0.5">{o.patientId}</p>
              </td>
              <td className="px-4 py-2.5">{o.studyName}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.reportedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function urgencyRank(o: RadiologyOrder): number {
  return o.urgency === "stat" ? 0 : o.urgency === "urgent" ? 1 : 2;
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-sm font-medium text-foreground ${mono ? "font-clinical" : ""}`}>{value}</span>
    </div>
  );
}

function UrgencyPill({ urgency }: { urgency: RadiologyOrder["urgency"] }) {
  return (
    <span className={`status-pill text-xs ${urgency === "stat" ? "bg-[hsl(var(--clinical-emergency))] text-white" : urgency === "urgent" ? "bg-[hsl(var(--clinical-urgent))] text-white" : "status-pill-pending"}`}>
      {urgency === "stat" ? "STAT" : urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

function StatusPill({ status }: { status: RadiologyOrderStatus }) {
  const cls =
    status === "reported"
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
