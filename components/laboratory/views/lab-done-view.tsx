"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { labStatus, labUrgencyLabel, storedFlag } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import type { LabOrderDto } from "@/types/clinical.types";

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function minutesBetween(a: string | null, b: string | null): string {
  if (!a || !b) return "—";
  const m = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** LAB-06 — results finished today, with how long each took from request to result. */
export function LabDoneView() {
  const router = useRouter();
  const authorisedQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "AUTHORISED"],
    queryFn: () => clinicalService.labWorklist("AUTHORISED"),
    refetchInterval: 60_000,
  });

  const rows = useMemo(
    () =>
      (authorisedQuery.data ?? [])
        .filter((o) => isToday(o.authorisedAt ?? o.completedAt))
        .sort((a, b) => (b.authorisedAt ?? "").localeCompare(a.authorisedAt ?? "")),
    [authorisedQuery.data],
  );

  if (authorisedQuery.isPending) return <TableSkeleton rows={5} columns={5} />;
  if (authorisedQuery.isError) return <ErrorState error={authorisedQuery.error} onRetry={() => void authorisedQuery.refetch()} />;
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState illustration="empty-list" title="No results finished yet today" description="Authorised results appear here." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-medium tracking-wide">Patient</th>
            <th className="px-4 py-2.5 font-medium tracking-wide">Test</th>
            <th className="px-4 py-2.5 font-medium tracking-wide">Result</th>
            <th className="px-4 py-2.5 font-medium tracking-wide">Finished</th>
            <th className="px-4 py-2.5 font-medium tracking-wide">Time taken</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((o) => (
            <DoneRow key={o.id} order={o} onOpen={() => router.push(`/laboratory?view=results&orderId=${o.id}`)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DoneRow({ order: o, onOpen }: { order: LabOrderDto; onOpen: () => void }) {
  const worst = o.results.map((r) => storedFlag(r.flag)).sort((a, b) => rank(b) - rank(a))[0] ?? "NORMAL";
  return (
    <tr>
      <td className="px-4 py-2.5">
        <p className="font-medium text-foreground">{naturalName(o.patientName)}</p>
        <p className="patient-id">{o.patientPublicId}</p>
      </td>
      <td className="px-4 py-2.5">
        <p className="text-foreground">{o.serviceName}</p>
        <p className="text-xs text-muted-foreground">{labUrgencyLabel(o.priority)}</p>
      </td>
      <td className="px-4 py-2.5">
        {worst === "CRITICAL" ? (
          <StatusPill tone="error">Critical</StatusPill>
        ) : worst === "NORMAL" ? (
          <StatusPill tone={labStatus(o.status).tone}>{labStatus(o.status).label}</StatusPill>
        ) : (
          <StatusPill tone="warning">Outside normal range</StatusPill>
        )}
      </td>
      <td className="px-4 py-2.5 font-clinical text-xs">{o.authorisedAt ? formatTime(o.authorisedAt) : "—"}</td>
      <td className="px-4 py-2.5 font-clinical text-xs">{minutesBetween(o.orderedAt, o.authorisedAt ?? o.completedAt)}</td>
      <td className="px-4 py-2.5 text-right">
        <Button size="sm" variant="ghost" onClick={onOpen}>
          View
        </Button>
      </td>
    </tr>
  );
}

function rank(f: string): number {
  return f === "CRITICAL" ? 3 : f === "HIGH" || f === "LOW" || f === "ABNORMAL" ? 2 : 1;
}
