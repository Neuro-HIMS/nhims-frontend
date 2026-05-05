"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock, FolderOpen, Inbox, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEncountersStore } from "@/store/encounters.store";
import { STATUS_LABEL, TRIAGE_LABELS, TRIAGE_ORDER, todayDateIso } from "@/components/nurse/lib/nurse-data";
import type { VisitStatus } from "@/lib/clinical-types";

const ACTIVE_STATUSES: VisitStatus[] = [
  "booked",
  "checked-in",
  "awaiting-triage",
  "in-triage",
  "awaiting-vitals",
  "in-vitals",
  "awaiting-consultation",
];

export function VisitsQueueView() {
  const router = useRouter();
  const visits = useEncountersStore((s) => s.visits);
  const updateVisitStatus = useEncountersStore((s) => s.updateVisitStatus);

  const [filter, setFilter] = useState<"active" | "all">("active");
  const [query, setQuery] = useState("");

  const today = todayDateIso();

  const todaysVisits = useMemo(() => {
    return visits
      .filter((v) => v.appointmentDate === today)
      .filter((v) => (filter === "active" ? ACTIVE_STATUSES.includes(v.status) : true))
      .filter((v) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          v.patientName.toLowerCase().includes(q) ||
          v.patientId.toLowerCase().includes(q) ||
          v.visitNo.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => TRIAGE_ORDER[a.priority] - TRIAGE_ORDER[b.priority] || a.appointmentTime.localeCompare(b.appointmentTime));
  }, [visits, filter, query, today]);

  function openFolder(visitId: string, patientId: string) {
    updateVisitStatus(visitId, "in-triage");
    router.push(`/nurse?view=folder&patientId=${patientId}&visitId=${visitId}`);
  }

  const stats = useMemo(() => {
    const todays = visits.filter((v) => v.appointmentDate === today);
    return {
      total: todays.length,
      awaiting: todays.filter((v) => v.status === "awaiting-triage" || v.status === "checked-in").length,
      inProgress: todays.filter((v) => ["in-triage", "in-vitals", "awaiting-consultation", "awaiting-vitals"].includes(v.status)).length,
      emergency: todays.filter((v) => v.priority === "emergency").length,
    };
  }, [visits, today]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip label="Total Today" value={stats.total} />
        <StatChip label="Awaiting Triage" value={stats.awaiting} accent="urgent" />
        <StatChip label="In Progress" value={stats.inProgress} accent="info" />
        <StatChip label="Emergency" value={stats.emergency} accent="emergency" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            Today's Visits Routed from Records
          </CardTitle>
          <CardDescription>
            Patients booked at registration appear here. Open a folder to triage, take vitals, and continue care.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, patient ID, or visit no…"
            />
            <Select value={filter} onValueChange={(v: "active" | "all") => setFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="all">All today</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setQuery("")}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
          </div>

          {todaysVisits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
              <Inbox className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No visits in queue</p>
              <p className="text-xs text-muted-foreground">
                When records books an appointment, the patient will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <Th>Time</Th>
                    <Th>Patient</Th>
                    <Th>Visit / Service</Th>
                    <Th>Reason</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {todaysVisits.map((v) => {
                    const triage = TRIAGE_LABELS[v.priority];
                    return (
                      <tr
                        key={v.id}
                        className={`table-row-interactive ${triage.rowClass}`}
                        onClick={() => openFolder(v.id, v.patientId)}
                      >
                        <td className="px-4 py-3 font-clinical text-xs text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {v.appointmentTime}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{v.patientName}</p>
                          <p className="patient-id mt-0.5">{v.patientId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{v.serviceName}</p>
                          <p className="patient-id mt-0.5">{v.visitNo} · {v.department}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground">{v.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`status-pill text-xs ${triage.badgeClass}`}>
                            {triage.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="status-pill status-pill-pending">
                            {STATUS_LABEL[v.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" className="gap-1">
                            <FolderOpen className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>
      {children}
    </th>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emergency" | "urgent" | "info";
}) {
  const cls =
    accent === "emergency"
      ? "border-[hsl(var(--clinical-emergency))] bg-[hsl(var(--clinical-emergency-bg))] text-[hsl(var(--clinical-emergency))]"
      : accent === "urgent"
      ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
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
