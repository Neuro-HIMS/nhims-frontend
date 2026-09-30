"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { TableSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { formatClinicalDateTime, formatTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { storedFlag } from "@/lib/lab-results";
import { canSeeCriticalInbox } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

const when = (iso: string) => (isToday(iso) ? formatTime(iso) : formatClinicalDateTime(iso));

interface CriticalRow {
  key: string;
  orderId: string;
  test: string;
  detail: string;
  patient: string;
  at: string;
  /** null = we can't tell (lab staff can't read the alert inbox yet). */
  seenByDoctor: boolean | null;
}

/**
 * LAB-04 — today's critical results and whether the doctor has seen them.
 * Doctors, nurses and admins read the alert inbox (open alerts = not seen yet). Lab staff can't
 * read it yet (backend-gaps.md#LAB-04-inbox-roles), so for them the list comes from today's
 * results flagged critical, without the "seen" status.
 */
export function LabCriticalView() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const seesInbox = canSeeCriticalInbox(role);

  const inboxQuery = useQuery({
    queryKey: queryKeys.clinical.labCriticalInbox,
    queryFn: () => clinicalService.labCriticalAlertsInbox(),
    refetchInterval: 30_000,
    enabled: seesInbox,
  });
  const enteredQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "COMPLETED"],
    queryFn: () => clinicalService.labWorklist("COMPLETED"),
    enabled: !seesInbox,
    refetchInterval: 30_000,
  });
  const authorisedQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "AUTHORISED"],
    queryFn: () => clinicalService.labWorklist("AUTHORISED"),
    enabled: !seesInbox,
    refetchInterval: 30_000,
  });

  const rows: CriticalRow[] = useMemo(() => {
    if (seesInbox) {
      return (inboxQuery.data ?? [])
        .filter((a) => a.status === "OPEN")
        .map((a) => ({
          key: a.id,
          orderId: a.labOrderId,
          test: a.serviceName,
          detail: a.summary.replace(/^Critical:\s*/i, ""),
          patient: a.patientPublicId,
          at: a.createdAt,
          seenByDoctor: false,
        }));
    }
    return [...(enteredQuery.data ?? []), ...(authorisedQuery.data ?? [])]
      .filter((o) => isToday(o.completedAt) && o.results.some((r) => storedFlag(r.flag) === "CRITICAL"))
      .map((o) => ({
        key: o.id,
        orderId: o.id,
        test: o.serviceName,
        detail: o.results
          .filter((r) => storedFlag(r.flag) === "CRITICAL")
          .map((r) => `${r.analyte} ${r.value}${r.units ? ` ${r.units}` : ""}`)
          .join("; "),
        patient: `${naturalName(o.patientName)} · ${o.patientPublicId}`,
        at: o.completedAt ?? o.orderedAt ?? "",
        seenByDoctor: null,
      }));
  }, [seesInbox, inboxQuery.data, enteredQuery.data, authorisedQuery.data]);
  const sorted = [...rows].sort((a, b) => b.at.localeCompare(a.at));

  const loading = seesInbox ? inboxQuery.isPending : enteredQuery.isPending || authorisedQuery.isPending;
  const error = seesInbox ? inboxQuery.error : enteredQuery.error ?? authorisedQuery.error;

  if (loading) return <TableSkeleton rows={3} columns={4} />;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void inboxQuery.refetch();
          void enteredQuery.refetch();
          void authorisedQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <InlineNotice tone="info">
        {seesInbox
          ? "Critical results stay here until the requesting doctor confirms they've seen them. If one waits long, call the doctor again."
          : "Today's critical results. Always phone or tell the requesting doctor in person — whether they've seen it on screen isn't shown here yet."}
      </InlineNotice>
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="all-done"
            tone="good-news"
            title={seesInbox ? "No critical results waiting" : "No critical results today"}
            description={seesInbox ? "Every critical result has been seen by a doctor." : "Critical results entered today will show here."}
          />
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {sorted.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {r.test}: {r.detail}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="patient-id">{r.patient}</span>
                  {r.at ? ` · ${when(r.at)}` : ""}
                </p>
              </div>
              {r.seenByDoctor === false && <StatusPill tone="pending">Waiting for doctor</StatusPill>}
              <Button size="sm" variant="outline" onClick={() => router.push(`/laboratory?view=results&orderId=${r.orderId}`)}>
                View result
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
