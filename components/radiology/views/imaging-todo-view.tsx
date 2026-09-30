"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/common/status-pill";
import { WaitingList } from "@/components/clinical/waiting-list";
import { naturalName } from "@/lib/display-name";
import { imagingStatus, isScanWaitingToPay } from "@/lib/imaging";
import { labUrgencyAsTriage, labUrgencyLabel } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { sortByUrgencyThenArrival } from "@/lib/sort-by-urgency";
import { clinicalService } from "@/services/clinical.service";
import type { RadiologyOrderDto } from "@/types/clinical.types";

const REFRESH_MS = 30_000;

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** RAD-01 — scans to do, most urgent first; unpaid scans wait for the cashier. */
export function ImagingTodoView() {
  const router = useRouter();
  const activeQuery = useQuery({
    queryKey: queryKeys.clinical.radiologyWorklist,
    queryFn: () => clinicalService.radiologyWorklist(),
    refetchInterval: REFRESH_MS,
  });
  const reportedQuery = useQuery({
    queryKey: [...queryKeys.clinical.radiologyWorklist, "COMPLETED"],
    queryFn: () => clinicalService.radiologyWorklist("COMPLETED"),
    refetchInterval: 60_000,
  });

  const rows = useMemo(
    () =>
      sortByUrgencyThenArrival(
        (activeQuery.data ?? []).filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"),
        (o) => labUrgencyAsTriage(o.priority),
        (o) => o.orderedAt ?? "",
      ),
    [activeQuery.data],
  );

  const stats = {
    waiting: rows.filter((o) => o.status === "ORDERED" || o.status === "READY").length,
    scanning: rows.filter((o) => o.status === "IN_PROGRESS").length,
    reportedToday: (reportedQuery.data ?? []).filter((o) => isToday(o.completedAt)).length,
  };

  const action = (o: RadiologyOrderDto) => (o.status === "IN_PROGRESS" ? "Write report" : "Start scan");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Waiting" value={stats.waiting} />
        <Stat label="Scanning, to report" value={stats.scanning} />
        <Stat label="Reported today" value={reportedQuery.isPending || reportedQuery.isError ? "—" : stats.reportedToday} />
      </div>
      <WaitingList
        items={activeQuery.isPending ? undefined : rows}
        isLoading={activeQuery.isPending}
        error={activeQuery.isError ? activeQuery.error : undefined}
        onRetry={() => void activeQuery.refetch()}
        presorted
        getRowId={(o) => o.id}
        getPatient={(o) => ({ name: naturalName(o.patientName), hospitalNumber: o.patientPublicId })}
        getArrivedAt={(o) => o.orderedAt ?? new Date().toISOString()}
        getWhat={(o) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {o.serviceName}
              {o.studyName && o.studyName !== o.serviceName ? ` — ${o.studyName}` : ""}
            </p>
            {o.clinicalNotes && <p className="line-clamp-2 text-xs text-muted-foreground">{o.clinicalNotes}</p>}
            <div className="flex flex-wrap gap-1.5">
              <StatusPill tone={labUrgencyAsTriage(o.priority) === "EMERGENCY" ? "error" : labUrgencyAsTriage(o.priority) === "URGENT" ? "warning" : "neutral"}>
                {labUrgencyLabel(o.priority)}
              </StatusPill>
              {isScanWaitingToPay(o) && <StatusPill tone="pending">Waiting to pay</StatusPill>}
            </div>
          </div>
        )}
        getStatus={(o) => imagingStatus(o.status)}
        primaryActionLabel={action}
        getActionDisabledReason={(o) => (isScanWaitingToPay(o) ? "Waiting for payment at the cashier" : null)}
        onOpen={(o) => router.push(`/radiology?view=study&orderId=${o.id}`)}
        refetchIntervalMs={REFRESH_MS}
        empty={{ illustration: "all-done", tone: "good-news", title: "No scans waiting", description: "New requests from doctors will appear here." }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </div>
  );
}
