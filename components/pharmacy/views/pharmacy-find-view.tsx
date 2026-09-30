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
import { cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { rxStatus } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

const RECENT_VISITS = 10;

/** PHA-05 — find a patient, then see their prescriptions from recent visits. */
export function PharmacyFindView() {
  const router = useRouter();
  const patientId = useSearchParams().get("patientId");
  if (!patientId) {
    return (
      <PatientSearchPanel
        cardTitle="Find a patient"
        cardDescription="Search by hospital number, NHIS number or name to see their prescriptions."
        actionLabel="See prescriptions"
        onSelectPatient={(p: Patient) => p.id && router.push(`/pharmacy?view=search&patientId=${encodeURIComponent(p.id)}`)}
      />
    );
  }
  return <PatientPrescriptions patientId={patientId} />;
}

function PatientPrescriptions({ patientId }: { patientId: string }) {
  const router = useRouter();
  const visitsQuery = useQuery({
    queryKey: queryKeys.clinical.byPatient(patientId),
    queryFn: () => clinicalService.byPatient(patientId),
  });
  const visits = [...(visitsQuery.data ?? [])]
    .sort((a, b) => (b.checkedInAt ?? b.createdAt ?? "").localeCompare(a.checkedInAt ?? a.createdAt ?? ""))
    .slice(0, RECENT_VISITS);
  const rxQueries = useQueries({
    queries: visits.map((v) => ({
      queryKey: queryKeys.clinical.prescriptions(v.id),
      queryFn: () => clinicalService.listPrescriptionsForEncounter(v.id),
    })),
  });
  const loading = visitsQuery.isPending || rxQueries.some((q) => q.isPending);
  const error = visitsQuery.error ?? rxQueries.find((q) => q.error)?.error;
  const rows = rxQueries.flatMap((q) => q.data ?? []).sort((a, b) => (b.prescribedAt ?? "").localeCompare(a.prescribedAt ?? ""));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push("/pharmacy?view=search")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Find another patient
      </Button>
      <PatientBanner patientId={patientId} />
      {loading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void visitsQuery.refetch();
            rxQueries.filter((q) => q.isError).forEach((q) => void q.refetch());
          }}
        />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState illustration="empty-list" title="No prescriptions yet" description={`None in this patient's last ${RECENT_VISITS} visits.`} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium tracking-wide">Prescribed</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Medicines</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">By</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Stage</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((rx) => (
                <tr key={rx.id}>
                  <td className="px-4 py-2.5 font-clinical text-xs">{rx.prescribedAt ? formatClinicalDateTime(rx.prescribedAt) : "—"}</td>
                  <td className="px-4 py-2.5 text-foreground">{rx.lines.map((l) => l.drugName).join(", ")}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{cleanPersonName(rx.prescribedByName) || "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={rxStatus(rx.status).tone}>{rxStatus(rx.status).label}</StatusPill>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/pharmacy?view=dispense&prescriptionId=${rx.id}`)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
