"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock, FolderOpen, Inbox, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABEL, TRIAGE_LABELS, TRIAGE_ORDER, todayDateIso } from "@/components/nurse/lib/nurse-data";
import { encounterToVisit } from "@/components/clinical/lib/encounter-adapter";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { VisitStatus } from "@/lib/clinical-types";
import type { ApiError } from "@/types/api.types";

const ACTIVE_STATUSES: VisitStatus[] = [
  "booked",
  "checked-in",
  "awaiting-triage",
  "in-triage",
  "awaiting-vitals",
  "in-vitals",
  "awaiting-consultation",
  "in-consultation",
];

export function VisitsQueueView() {
  const router = useRouter();
  const qc = useQueryClient();

  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: 30_000,
  });

  const checkInMut = useMutation({
    mutationFn: (id: string) => clinicalService.transition(id, { to: "AT_VITALS" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clinical.all }),
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not advance encounter");
    },
  });

  const [filter, setFilter] = useState<"active" | "all">("active");
  const [query, setQuery] = useState("");

  const today = todayDateIso();

  const rows = useMemo(
    () =>
      (todayQuery.data ?? []).map((e) => ({
        encounter: e,
        visit: encounterToVisit(e),
      })),
    [todayQuery.data],
  );

  const todaysRows = useMemo(() => {
    return rows
      .filter((r) => r.visit.appointmentDate === today)
      .filter((r) => (filter === "active" ? ACTIVE_STATUSES.includes(r.visit.status) : true))
      .filter((r) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          r.visit.patientName.toLowerCase().includes(q) ||
          r.visit.patientId.toLowerCase().includes(q) ||
          r.visit.visitNo.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          TRIAGE_ORDER[a.visit.priority] - TRIAGE_ORDER[b.visit.priority] ||
          a.visit.appointmentTime.localeCompare(b.visit.appointmentTime),
      );
  }, [rows, filter, query, today]);

  function openFolder(encounterId: string, patientUuid: string, currentStatus: VisitStatus) {
    if (currentStatus === "booked") {
      checkInMut.mutate(encounterId);
    }
    router.push(`/nurse?view=folder&patientId=${patientUuid}&visitId=${encounterId}`);
  }

  const stats = useMemo(() => {
    const todays = rows.filter((r) => r.visit.appointmentDate === today).map((r) => r.visit);
    return {
      total: todays.length,
      awaiting: todays.filter((v) => v.status === "awaiting-triage" || v.status === "awaiting-vitals" || v.status === "checked-in").length,
      inProgress: todays.filter((v) =>
        ["in-triage", "in-vitals", "awaiting-consultation", "in-consultation"].includes(v.status),
      ).length,
      emergency: todays.filter((v) => v.priority === "emergency").length,
    };
  }, [rows, today]);

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
            Today&apos;s Visits Routed from Records
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
            <Button variant="outline" onClick={() => todayQuery.refetch()} disabled={todayQuery.isFetching}>
              {todayQuery.isFetching ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          {todayQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading queue…
            </div>
          ) : todaysRows.length === 0 ? (
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
                  {todaysRows.map(({ encounter, visit: v }) => {
                    const triage = TRIAGE_LABELS[v.priority];
                    return (
                      <tr
                        key={v.id}
                        className={`table-row-interactive ${triage.rowClass}`}
                        onClick={() => openFolder(encounter.id, encounter.patientId, v.status)}
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
                          <span className={`status-pill text-xs ${triage.badgeClass}`}>{triage.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="status-pill status-pill-pending">{STATUS_LABEL[v.status]}</span>
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
