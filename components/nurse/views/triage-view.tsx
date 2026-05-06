"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TRIAGE_LABELS, TRIAGE_ORDER, todayDateIso } from "@/components/nurse/lib/nurse-data";
import { encounterToVisit } from "@/components/clinical/lib/encounter-adapter";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { TriagePriority } from "@/lib/clinical-types";
import type { ApiError } from "@/types/api.types";

export function TriageView() {
  const today = todayDateIso();
  const qc = useQueryClient();

  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: 30_000,
  });

  const triageMut = useMutation({
    mutationFn: ({
      id,
      priority,
      chiefComplaint,
    }: {
      id: string;
      priority: TriagePriority;
      chiefComplaint: string;
    }) =>
      clinicalService.recordTriage(id, {
        priority: mapPriority(priority),
        chiefComplaint,
        reasoning: "",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Triage assigned — patient sent to vitals");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not assign triage");
    },
  });

  function mapPriority(p: TriagePriority): "ROUTINE" | "URGENT" | "EMERGENCY" | "SEMI_URGENT" {
    switch (p) {
      case "emergency":
        return "EMERGENCY";
      case "urgent":
        return "URGENT";
      case "semi":
        return "SEMI_URGENT";
      case "routine":
      default:
        return "ROUTINE";
    }
  }

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visits = useMemo(
    () => (todayQuery.data ?? []).map(encounterToVisit),
    [todayQuery.data],
  );

  const queue = useMemo(() => {
    return visits
      .filter((v) => v.appointmentDate === today)
      .filter((v) =>
        ["awaiting-triage", "checked-in", "in-triage", "booked", "awaiting-vitals"].includes(v.status),
      )
      .sort(
        (a, b) =>
          TRIAGE_ORDER[a.priority] - TRIAGE_ORDER[b.priority] ||
          a.appointmentTime.localeCompare(b.appointmentTime),
      );
  }, [visits, today]);

  const selected = queue.find((v) => v.id === selectedId) ?? null;

  function assign(level: TriagePriority) {
    if (!selected) return;
    triageMut.mutate(
      { id: selected.id, priority: level, chiefComplaint: selected.reason },
      { onSuccess: () => setSelectedId(null) },
    );
  }

  const triagedCount = visits.filter(
    (v) => v.appointmentDate === today && v.priority !== "pending",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {queue.length} awaiting triage · {triagedCount} triaged today
        </p>
        {todayQuery.isFetching && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Activity className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Triage queue is clear</p>
              <p className="text-xs text-muted-foreground">All booked patients have been triaged.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Patient</Th>
                  <Th>Arrival</Th>
                  <Th>Reason</Th>
                  <Th>Priority</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queue.map((v) => {
                  const triage = TRIAGE_LABELS[v.priority];
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedId(v.id)}
                      className={`table-row-interactive ${triage.rowClass} ${
                        selectedId === v.id ? "ring-2 ring-inset ring-primary" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{v.patientName}</p>
                        <p className="patient-id mt-0.5">{v.patientId}</p>
                      </td>
                      <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">{v.appointmentTime}</td>
                      <td className="px-4 py-3 text-foreground">{v.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill text-xs ${triage.badgeClass}`}>{triage.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.patientName}</CardTitle>
              <CardDescription>{selected.visitNo} · {selected.serviceName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Chief Complaint
                </p>
                <p className="text-foreground">{selected.reason}</p>
              </div>
              <p className="text-sm font-medium text-foreground">Assign Priority</p>
              <div className="grid gap-2">
                {(["emergency", "urgent", "semi", "routine"] as const).map((level) => (
                  <button
                    key={level}
                    disabled={triageMut.isPending}
                    onClick={() => assign(level)}
                    className={`flex items-center gap-3 rounded-md border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-60 ${
                      level === "emergency"
                        ? "border-[hsl(var(--clinical-emergency))] bg-[hsl(var(--clinical-emergency-bg))] text-[hsl(var(--clinical-emergency))]"
                        : level === "urgent"
                        ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
                        : level === "semi"
                        ? "border-[hsl(var(--clinical-semi-urgent))] bg-[hsl(var(--clinical-semi-urgent-bg))] text-[hsl(var(--clinical-semi-urgent))]"
                        : "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))] text-[hsl(var(--clinical-routine))]"
                    }`}
                  >
                    {TRIAGE_LABELS[level].label}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSelectedId(null)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select a patient to assign triage</p>
            </CardContent>
          </Card>
        )}
      </div>
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
