"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth.store";
import {
  canCompleteVisit,
  canMoveVisitToAnyStage,
  canPlaceOrders,
  canRecordVitals,
  canViewFullFolder,
} from "@/lib/permissions";
import { getFriendlyError } from "@/lib/api-errors";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { NoAccessNotice } from "@/components/common/no-access-notice";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { CriticalResults } from "@/components/clinical/lab/critical-results";
import { FolderVisits } from "@/components/clinical/folder/folder-visits";
import { FolderVitals } from "@/components/clinical/folder/folder-vitals";
import { FolderConsultations } from "@/components/clinical/folder/folder-consultations";
import { FolderTreatments } from "@/components/clinical/folder/folder-treatments";
import { FolderAdmissions } from "@/components/clinical/folder/folder-admissions";
import { FolderReferrals } from "@/components/clinical/folder/folder-referrals";
import { FolderAlerts } from "@/components/clinical/folder/folder-alerts";
import { LabOrdersCard } from "@/components/clinical/lab/lab-orders-card";
import { ImagingOrdersCard } from "@/components/clinical/imaging/imaging-orders-card";
import { MedicinesCard } from "@/components/clinical/pharmacy/medicines-card";
import {
  encounterToVisit,
  visitStatusToEncounterStatus,
} from "@/components/clinical/lib/encounter-adapter";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { VisitStatus } from "@/lib/clinical-types";

const FOLDER_TABS = [
  { id: "overview", label: "Visits" },
  { id: "vitals", label: "Vitals" },
  { id: "consultations", label: "Notes" },
  { id: "tests", label: "Tests" },
  { id: "medicines", label: "Medicines" },
  { id: "treatments", label: "Treatments" },
  { id: "admissions", label: "Admissions" },
  { id: "referrals", label: "Referrals" },
  { id: "alerts", label: "Alerts" },
] as const;

type FolderTab = (typeof FOLDER_TABS)[number]["id"];

/** `nurseCan`: the stages a nurse may move a visit to; the rest need a doctor (see canMoveVisitToAnyStage). */
const NEXT_STATUS_OPTIONS: { value: VisitStatus; label: string; nurseCan: boolean }[] = [
  { value: "checked-in", label: "Mark as checked in", nurseCan: true },
  { value: "in-vitals", label: "Mark as having vitals taken", nurseCan: true },
  { value: "awaiting-consultation", label: "Send to doctor", nurseCan: true },
  { value: "in-consultation", label: "Start consultation", nurseCan: false },
  { value: "awaiting-lab", label: "Send to the lab", nurseCan: false },
  { value: "awaiting-pharmacy", label: "Send to pharmacy", nurseCan: false },
  { value: "completed", label: "Finish visit", nurseCan: false },
  { value: "cancelled", label: "Cancel visit", nurseCan: true },
];

export function PatientFolderView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientUuid = searchParams.get("patientId"); // backend UUID
  const visitIdParam = searchParams.get("visitId");

  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userLabel = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.username || user.email
    : "";

  const allowed = canViewFullFolder(user?.role);
  const canOrder = canPlaceOrders(user?.role);
  const canVitals = canRecordVitals(user?.role);
  const canAnyStage = canMoveVisitToAnyStage(user?.role);
  const canComplete = canCompleteVisit(user?.role);
  const statusOptions = NEXT_STATUS_OPTIONS.filter(
    (o) => (canAnyStage || o.nurseCan) && (o.value !== "completed" || canComplete),
  );
  const visibleTabs = FOLDER_TABS.filter((t) => t.id !== "vitals" || canVitals);

  const encountersQuery = useQuery({
    queryKey: patientUuid ? queryKeys.clinical.byPatient(patientUuid) : ["clinical", "encounters", "by-patient", "idle"],
    queryFn: () => clinicalService.byPatient(patientUuid!),
    enabled: Boolean(patientUuid && allowed),
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitStatus }) =>
      clinicalService.transition(id, { to: visitStatusToEncounterStatus(status) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clinical.all }),
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const completeMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      clinicalService.complete(id, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Visit finished. The bill has been closed.");
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => clinicalService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Visit cancelled.");
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const [tab, setTab] = useState<FolderTab>("overview");
  const [statusSelectKey, setStatusSelectKey] = useState(0);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeVia, setCompleteVia] = useState<"button" | "dropdown" | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const visits = useMemo(
    () => (encountersQuery.data ?? []).map(encounterToVisit),
    [encountersQuery.data],
  );

  const visit = useMemo(() => {
    if (visits.length === 0) return null;
    if (visitIdParam) {
      return visits.find((v) => v.id === visitIdParam) ?? visits[0];
    }
    return visits[0];
  }, [visits, visitIdParam]);

  // Patient public id is carried alongside the visit so existing folder
  // tabs (which still expect the legacy "patient public id" string) keep
  // working until they're migrated to API reads in later phases.
  const patientPublicId = visit?.patientId ?? "";

  if (!allowed) return <NoAccessNotice />;

  if (!patientUuid) {
    return (
      <EmptyState
        illustration="choose-patient"
        title="No patient selected"
        description="Open a folder from Today's patients, or find the patient first."
        action={{ label: "Today's patients", href: "/nurse?view=visits" }}
        secondaryAction={{ label: "Find a patient", href: "/nurse?view=search" }}
      />
    );
  }

  if (encountersQuery.isPending) {
    return (
      <div className="space-y-4">
        <BannerSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (encountersQuery.isError) {
    return <ErrorState error={encountersQuery.error} onRetry={() => void encountersQuery.refetch()} />;
  }

  function changeStatus(value: VisitStatus) {
    if (!visit) return;
    transitionMut.mutate(
      { id: visit.id, status: value },
      {
        onSuccess: () =>
          toast.success("Visit moved.", {
            description: NEXT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? "",
          }),
      },
    );
  }

  function onStatusSelect(value: VisitStatus) {
    if (!visit) return;
    if (value === "completed") {
      setCompleteVia("dropdown");
      setCompleteDialogOpen(true);
      setStatusSelectKey((k) => k + 1);
      return;
    }
    if (value === "cancelled") {
      setCancelReason("");
      setCancelDialogOpen(true);
      setStatusSelectKey((k) => k + 1);
      return;
    }
    changeStatus(value);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/nurse?view=visits")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to today&apos;s patients
        </Button>
        {visit && (
          <div className="flex items-center gap-2">
            <Select key={statusSelectKey} onValueChange={(v) => onStatusSelect(v as VisitStatus)}>
              <SelectTrigger className="w-56" disabled={transitionMut.isPending}>
                <ArrowRight className="mr-1.5 h-4 w-4" />
                <SelectValue placeholder="Move visit to…" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canComplete && (
            <Button
              variant="default"
              size="sm"
              disabled={completeMut.isPending || visit.status === "completed"}
              onClick={() => {
                setCompleteVia("button");
                setCompleteDialogOpen(true);
              }}
            >
              {completeMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Finish visit
            </Button>
            )}
          </div>
        )}
      </div>

      <PatientBanner patientId={patientUuid!} encounterId={visit?.id} />
      {visit && <CriticalResults encounterId={visit.id} />}

      <div className="overflow-x-auto">
        <nav className="module-subnav">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`module-subnav-tab ${tab === t.id ? "active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-2">
        {tab === "overview" &&
          (visits.length === 0 ? (
            <EmptyState
              illustration="empty-list"
              title="No visits yet"
              description="This patient has no visits on record. Records can start a visit from Find a patient."
            />
          ) : (
            <FolderVisits visits={visits} currentVisitId={visit?.id} />
          ))}
        {tab === "vitals" && canVitals && (
          <FolderVitals patientId={patientPublicId} visit={visit} recordedBy={userLabel} />
        )}
        {tab === "consultations" && (
          <FolderConsultations patientId={patientPublicId} visit={visit} authoredBy={userLabel} />
        )}
        {tab === "tests" && (
          <div className="space-y-4">
            {visit && (
              <LabOrdersCard
                encounterId={visit.id}
                patientName={visit.patientName}
                payerType={visit.sponsor}
                canOrder={canOrder}
              />
            )}
            {visit && (
              <ImagingOrdersCard encounterId={visit.id} patientName={visit.patientName} payerType={visit.sponsor} canOrder={canOrder} />
            )}
          </div>
        )}
        {tab === "medicines" && (
          visit && (
            <MedicinesCard
              encounterId={visit.id}
              patientId={patientUuid!}
              patientName={visit.patientName}
              payerType={visit.sponsor}
              canPrescribe={canOrder}
            />
          )
        )}
        {tab === "treatments" && (
          <FolderTreatments patientUuid={patientUuid} visit={visit} />
        )}
        {tab === "admissions" && (
          <FolderAdmissions patientUuid={patientUuid!} visit={visit} />
        )}
        {tab === "referrals" && (
          <FolderReferrals visit={visit} />
        )}
        {tab === "alerts" && (
          <FolderAlerts patientUuid={patientUuid!} />
        )}
      </div>

      <ConfirmDialog
        open={completeDialogOpen && completeVia !== null && Boolean(visit)}
        onOpenChange={(open) => {
          setCompleteDialogOpen(open);
          if (!open) setCompleteVia(null);
        }}
        title={`Finish ${visit?.patientName ?? "this patient"}'s visit?`}
        description="This finishes the visit and closes the bill. If something is still waiting, such as a test result, you'll be told what."
        confirmLabel="Finish visit"
        pending={completeVia === "button" ? completeMut.isPending : transitionMut.isPending}
        onConfirm={async () => {
          if (!visit || !completeVia) return;
          if (completeVia === "button") {
            await completeMut.mutateAsync({ id: visit.id, force: false });
            return;
          }
          await transitionMut.mutateAsync({ id: visit.id, status: "completed" });
          toast.success("Visit finished.");
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen && Boolean(visit)}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setCancelReason("");
        }}
        title={`Cancel ${visit?.patientName ?? "this patient"}'s visit?`}
        description="Say why. Your reason is kept with the visit so supervisors can see it."
        confirmLabel="Cancel visit"
        destructive
        footerExtra={
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="e.g. Patient left before being seen"
          />
        }
        pending={cancelMut.isPending}
        onConfirm={async () => {
          if (!visit) return;
          const trimmed = cancelReason.trim();
          if (!trimmed) {
            toast.error("Add a reason before cancelling the visit.");
            throw new Error("missing reason");
          }
          await cancelMut.mutateAsync({ id: visit.id, reason: trimmed });
        }}
      />
    </div>
  );
}
