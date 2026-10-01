"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, LogOut, Plus } from "lucide-react";

import { FolderRecordExpandableRow, FolderRecordFeedBanner, FolderRecordField } from "@/components/clinical/folder/folder-record-expandable";
import { ErrorState } from "@/components/common/error-state";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdmitDialog } from "@/components/wards/admit-dialog";
import { DischargeDialog } from "@/components/wards/discharge-dialog";
import { formatClinicalDateTime } from "@/lib/dates";
import { cleanPersonName } from "@/lib/display-name";
import { canAdmitAndDischarge } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { DISCHARGE_OUTCOME_LABELS } from "@/lib/status-labels";
import { dayOfStay, DISCHARGE_OUTCOMES } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { AdmissionDto } from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

interface FolderAdmissionsProps {
  patientUuid: string;
  visit: Visit | null;
}

/**
 * Ward stays inside the patient folder (and the doctor's "Admit" next step): admit through DOC-10,
 * discharge through DOC-12, and each stay's details.
 */
export function FolderAdmissions({ patientUuid, visit }: FolderAdmissionsProps) {
  const role = useAuthStore((s) => s.user?.role);
  const [admitting, setAdmitting] = useState(false);
  const [discharging, setDischarging] = useState<AdmissionDto | null>(null);

  const admissionsQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.admissions(visit.id) : ["clinical", "admissions", "patient", patientUuid],
    queryFn: () => (visit ? clinicalService.listAdmissionsForEncounter(visit.id) : clinicalService.listAdmissionsForPatient(patientUuid)),
    enabled: Boolean(patientUuid),
  });

  const list = useMemo(() => admissionsQuery.data ?? [], [admissionsQuery.data]);
  const active = list.find((a) => a.status === "ADMITTED");
  const sorted = useMemo(() => [...list].sort((a, b) => (b.admittedAt ?? "").localeCompare(a.admittedAt ?? "")), [list]);
  const mayAdmit = canAdmitAndDischarge(role);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Ward stays</p>
          <p className="text-xs text-muted-foreground">
            {active ? `On ${active.ward}${active.bed ? `, bed ${active.bed}` : ""}${dayOfStay(active.admittedAt) ? ` · day ${dayOfStay(active.admittedAt)}` : ""}` : "Not on a ward now"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {active && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/wards?view=admission&admissionId=${active.id}`}>Open on the ward</Link>
            </Button>
          )}
          {mayAdmit && !active && (
            <Button size="sm" onClick={() => setAdmitting(true)} disabled={!visit} title={visit ? undefined : "Open the patient from a visit to admit them."}>
              <Plus className="mr-1.5 h-4 w-4" /> Admit to a ward
            </Button>
          )}
        </div>
      </div>

      {admissionsQuery.isPending ? (
        <CardSkeleton />
      ) : admissionsQuery.isError ? (
        <ErrorState error={admissionsQuery.error} onRetry={() => void admissionsQuery.refetch()} />
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <BedDouble className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No ward stays on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <FolderRecordFeedBanner>Open a stay to see why the patient was admitted and the discharge details.</FolderRecordFeedBanner>
          {sorted.map((a, idx) => (
            <FolderRecordExpandableRow
              key={a.id}
              railIndex={sorted.length - idx}
              icon={BedDouble}
              eyebrow={a.status === "ADMITTED" ? "On the ward" : "Ward stay"}
              title={
                <span>
                  {a.ward}
                  {a.bed ? (
                    <>
                      , bed <span className="font-clinical">{a.bed}</span>
                    </>
                  ) : null}
                </span>
              }
              preview={a.reason?.trim() ? <span className="line-clamp-2">{a.reason}</span> : null}
              footerTime={a.status === "DISCHARGED" ? (a.dischargedAt ?? a.admittedAt) : a.admittedAt}
              badges={
                a.status === "ADMITTED" ? (
                  <StatusPill tone="info">On the ward</StatusPill>
                ) : (
                  <StatusPill tone="neutral">{`Discharged${a.dischargedAt ? ` · ${formatClinicalDateTime(a.dischargedAt)}` : ""}`}</StatusPill>
                )
              }
              headerActions={
                a.status === "ADMITTED" && mayAdmit ? (
                  <Button size="sm" variant="outline" onClick={() => setDischarging(a)}>
                    <LogOut className="mr-1.5 h-4 w-4" /> Discharge
                  </Button>
                ) : null
              }
            >
              <div className="space-y-4">
                <FolderRecordField label="Why admitted" value={a.reason?.trim() || null} />
                <FolderRecordField label="Admitted" value={`${a.admittedAt ? formatClinicalDateTime(a.admittedAt) : "—"}${a.admittedByName ? ` · ${cleanPersonName(a.admittedByName)}` : ""}`} />
                {a.dischargeOutcome && (
                  <FolderRecordField label="Outcome" value={DISCHARGE_OUTCOMES.find((o) => o.code === a.dischargeOutcome)?.label ?? DISCHARGE_OUTCOME_LABELS[a.dischargeOutcome] ?? a.dischargeOutcome} />
                )}
                {a.dischargeSummary && <FolderRecordField label="Discharge summary" value={`${a.dischargedByName ? `${cleanPersonName(a.dischargedByName)}\n` : ""}${a.dischargeSummary}`} />}
                {a.dischargeIcd11Codes && <FolderRecordField label="Diagnosis codes" value={a.dischargeIcd11Codes} />}
                {a.dischargeMedicationSummary && <FolderRecordField label="Medicines to take home" value={a.dischargeMedicationSummary} />}
                {a.followUpPlan && <FolderRecordField label="Follow-up plan" value={a.followUpPlan} />}
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}

      {visit && <AdmitDialog open={admitting} onOpenChange={setAdmitting} encounterId={visit.id} patientName={visit.patientName} reason={visit.reason} />}
      {discharging && <DischargeDialog admission={discharging} onClose={() => setDischarging(null)} />}
    </div>
  );
}
