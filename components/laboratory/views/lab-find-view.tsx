"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import type { Patient } from "@/components/records/lib/records-types";
import { Button } from "@/components/ui/button";
import { formatClinicalDateTime } from "@/lib/dates";
import { labStatus, labUrgencyLabel } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

const RECENT_VISITS = 10;

/** LAB-07 — find a patient, then see all their tests from recent visits. */
export function LabFindView() {
  const router = useRouter();
  const patientId = useSearchParams().get("patientId");

  if (!patientId) {
    return (
      <PatientSearchPanel
        cardTitle="Find a patient"
        cardDescription="Search by hospital number, NHIS number or name to see their lab tests."
        actionLabel="See tests"
        onSelectPatient={(p: Patient) => p.id && router.push(`/laboratory?view=search&patientId=${encodeURIComponent(p.id)}`)}
      />
    );
  }
  return <PatientTests patientId={patientId} />;
}

function PatientTests({ patientId }: { patientId: string }) {
  const router = useRouter();
  const visitsQuery = useQuery({
    queryKey: queryKeys.clinical.byPatient(patientId),
    queryFn: () => clinicalService.byPatient(patientId),
  });
  const visits = [...(visitsQuery.data ?? [])]
    .sort((a, b) => (b.checkedInAt ?? b.createdAt ?? "").localeCompare(a.checkedInAt ?? a.createdAt ?? ""))
    .slice(0, RECENT_VISITS);

  const orderQueries = useQueries({
    queries: visits.map((v) => ({
      queryKey: queryKeys.clinical.labOrders(v.id),
      queryFn: () => clinicalService.listLabOrdersForEncounter(v.id),
    })),
  });
  const loading = visitsQuery.isPending || orderQueries.some((q) => q.isPending);
  const error = visitsQuery.error ?? orderQueries.find((q) => q.error)?.error;
  const orders = orderQueries
    .flatMap((q, i) => (q.data ?? []).map((o) => ({ order: o, visitNumber: visits[i].encounterNumber })))
    .sort((a, b) => (b.order.orderedAt ?? "").localeCompare(a.order.orderedAt ?? ""));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push("/laboratory?view=search")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Find another patient
      </Button>
      <PatientBanner patientId={patientId} />
      {loading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void visitsQuery.refetch();
            orderQueries.filter((q) => q.isError).forEach((q) => void q.refetch());
          }}
        />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState illustration="empty-list" title="No lab tests yet" description={`No tests in this patient's last ${RECENT_VISITS} visits.`} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium tracking-wide">Requested</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Test</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Stage</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Visit</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(({ order: o, visitNumber }) => {
                const s = labStatus(o.status);
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-2.5 font-clinical text-xs">{o.orderedAt ? formatClinicalDateTime(o.orderedAt) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-foreground">{o.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{labUrgencyLabel(o.priority)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill tone={s.tone}>{s.label}</StatusPill>
                    </td>
                    <td className="px-4 py-2.5 font-clinical text-xs text-muted-foreground">{visitNumber}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/laboratory?view=results&orderId=${o.id}`)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
