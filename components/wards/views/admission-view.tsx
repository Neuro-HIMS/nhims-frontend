"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";

import { ConsultationNoteDialog } from "@/components/clinical/consultation/consultation-note-dialog";
import { TreatmentsCard } from "@/components/clinical/folder/folder-treatments";
import { ImagingOrdersCard } from "@/components/clinical/imaging/imaging-orders-card";
import { LabOrdersCard } from "@/components/clinical/lab/lab-orders-card";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { MedicinesCard } from "@/components/clinical/pharmacy/medicines-card";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { DischargeDialog } from "@/components/wards/discharge-dialog";
import { MedicinesGivenCard } from "@/components/wards/medicines-given-card";
import { ObservationsCard } from "@/components/wards/observations-card";
import { Button } from "@/components/ui/button";
import { formatClinicalDateTime } from "@/lib/dates";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { canAdmitAndDischarge, canPlaceOrders, canRecordWardCare } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { dayOfStay } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { AdmissionDto } from "@/types/clinical.types";

type Tab = "care" | "round";

/** NUR-08 / NUR-09 / DOC-11 / DOC-12 — one inpatient: ward care, ward round, discharge. */
export function AdmissionView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("admissionId");
  const activeQuery = useQuery({ queryKey: queryKeys.ipd.activeAdmissions, queryFn: () => clinicalService.activeAdmissions() });
  const admission = activeQuery.data?.find((a) => a.id === id) ?? null;
  // Held here: once discharged the admission leaves the active list, but the summary dialog must stay open.
  const [discharging, setDischarging] = useState<AdmissionDto | null>(null);
  const dischargeDialog = discharging && <DischargeDialog admission={discharging} onClose={() => setDischarging(null)} />;

  const back = (
    <Button variant="ghost" size="sm" onClick={() => router.push("/wards?view=admissions")}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to patients on the ward
    </Button>
  );
  if (activeQuery.isPending) return <div className="space-y-4">{back}<BannerSkeleton /><CardSkeleton /></div>;
  if (activeQuery.isError) return <div className="space-y-4">{back}<ErrorState error={activeQuery.error} onRetry={() => void activeQuery.refetch()} /></div>;
  if (!admission) {
    return (
      <div className="space-y-4">
        {back}
        <InlineNotice tone="info">This patient is no longer on the ward. Their stay is in their folder.</InlineNotice>
        {dischargeDialog}
      </div>
    );
  }
  return (
    <>
      <Admission admission={admission} back={back} onDischarge={() => setDischarging(admission)} />
      {dischargeDialog}
    </>
  );
}

function Admission({ admission, back, onDischarge }: { admission: AdmissionDto; back: React.ReactNode; onDischarge: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState<Tab>("care");
  const [writing, setWriting] = useState(false);
  const encounterId = admission.encounterId ?? "";
  const encounterQuery = useQuery({ queryKey: queryKeys.clinical.encounter(encounterId), queryFn: () => clinicalService.byId(encounterId), enabled: Boolean(encounterId) });
  const notesQuery = useQuery({ queryKey: queryKeys.clinical.consultations(encounterId), queryFn: () => clinicalService.listConsultationNotes(encounterId), enabled: Boolean(encounterId) && tab === "round" });

  const day = dayOfStay(admission.admittedAt);
  const name = naturalName(admission.patientName);
  const payer = encounterQuery.data?.payerType ?? "CASH";
  const prescriber = canPlaceOrders(role);
  const notes = [...(notesQuery.data ?? [])].sort((a, b) => (b.authoredAt ?? "").localeCompare(a.authoredAt ?? ""));

  return (
    <div className="space-y-4">
      {back}
      {admission.patientId && <PatientBanner patientId={admission.patientId} encounterId={encounterId || undefined} />}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            {admission.ward}
            {admission.bed ? `, bed ${admission.bed}` : ""}
            {day ? ` · Day ${day}` : ""}
          </p>
          <p className="text-muted-foreground">
            Admitted {admission.admittedAt ? formatClinicalDateTime(admission.admittedAt) : "—"} by {cleanPersonName(admission.admittedByName) || "a clinician"}
            {admission.reason ? ` · ${admission.reason}` : ""}
          </p>
        </div>
        {canAdmitAndDischarge(role) && <Button onClick={onDischarge}>Discharge</Button>}
      </section>

      <div role="tablist" aria-label="Admission" className="flex gap-1 border-b border-border">
        {(
          [
            ["care", "Ward care"],
            ["round", "Ward round"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", tab === t ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "care" ? (
        <div className="space-y-4">
          <MedicinesGivenCard admission={admission} canRecord={canRecordWardCare(role)} />
          <ObservationsCard admission={admission} canRecord={canRecordWardCare(role)} />
        </div>
      ) : !encounterId ? (
        <InlineNotice tone="warning">This admission isn&apos;t linked to a visit, so notes and orders can&apos;t be shown.</InlineNotice>
      ) : (
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Ward round notes</h2>
              {prescriber && (
                <Button size="sm" variant="outline" onClick={() => setWriting(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Write today&apos;s note
                </Button>
              )}
            </div>
            {notesQuery.isPending ? (
              <CardSkeleton />
            ) : notesQuery.isError ? (
              <ErrorState error={notesQuery.error} onRetry={() => void notesQuery.refetch()} />
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes on this stay yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {n.authoredAt ? formatClinicalDateTime(n.authoredAt) : "—"} · {cleanPersonName(n.authoredByName) || "a clinician"}
                    </p>
                    {[
                      ["How they are", n.historyOfPresentComplaint],
                      ["What I found", n.examinationFindings],
                      ["Assessment", n.assessment],
                      ["Plan", n.plan],
                    ]
                      .filter(([, v]) => v?.trim())
                      .map(([label, v]) => (
                        <p key={label} className="mt-1 whitespace-pre-line">
                          <span className="font-medium text-foreground">{label}:</span> {v}
                        </p>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">Orders</h2>
            <LabOrdersCard bare encounterId={encounterId} patientName={name} payerType={payer} canOrder={prescriber} />
            <div className="border-t border-border pt-3">
              <ImagingOrdersCard encounterId={encounterId} patientName={name} payerType={payer} canOrder={prescriber} />
            </div>
            <div className="border-t border-border pt-3">
              {admission.patientId && <MedicinesCard bare encounterId={encounterId} patientId={admission.patientId} patientName={name} payerType={payer} canPrescribe={prescriber} />}
            </div>
            <div className="border-t border-border pt-3">{admission.patientId && <TreatmentsCard bare onlyThisVisit patientUuid={admission.patientId} encounterId={encounterId} />}</div>
          </section>
        </div>
      )}

      <ConsultationNoteDialog open={writing} onOpenChange={setWriting} encounterId={encounterId} visitNumber={encounterQuery.data?.encounterNumber} />
    </div>
  );
}
