"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth.store";
import { canViewFullFolder, canPlaceOrders, canRecordVitals } from "@/lib/permissions";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { FolderVisits } from "@/components/clinical/folder/folder-visits";
import { FolderVitals } from "@/components/clinical/folder/folder-vitals";
import { FolderConsultations } from "@/components/clinical/folder/folder-consultations";
import { FolderTreatments } from "@/components/clinical/folder/folder-treatments";
import { FolderAdmissions } from "@/components/clinical/folder/folder-admissions";
import { FolderReferrals } from "@/components/clinical/folder/folder-referrals";
import { FolderAlerts } from "@/components/clinical/folder/folder-alerts";
import { FolderOrdersLab } from "@/components/clinical/folder/folder-orders-lab";
import { FolderOrdersRadiology } from "@/components/clinical/folder/folder-orders-radiology";
import { FolderOrdersRx } from "@/components/clinical/folder/folder-orders-rx";
import {
  encounterToVisit,
  visitStatusToEncounterStatus,
} from "@/components/clinical/lib/encounter-adapter";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { VisitStatus } from "@/lib/clinical-types";
import type { ApiError } from "@/types/api.types";

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

const NEXT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: "checked-in", label: "Mark: Checked In" },
  { value: "in-vitals", label: "Mark: Recording Vitals" },
  { value: "awaiting-consultation", label: "Send to Consultation" },
  { value: "in-consultation", label: "Start Consultation" },
  { value: "awaiting-lab", label: "Send to Laboratory" },
  { value: "awaiting-pharmacy", label: "Send to Pharmacy" },
  { value: "completed", label: "Complete Visit" },
  { value: "cancelled", label: "Cancel Visit" },
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
    : "Nurse on Duty";

  const allowed = canViewFullFolder(user?.role);
  const canOrder = canPlaceOrders(user?.role);
  const canVitals = canRecordVitals(user?.role);

  const encountersQuery = useQuery({
    queryKey: patientUuid ? queryKeys.clinical.byPatient(patientUuid) : ["clinical", "encounters", "by-patient", "idle"],
    queryFn: () => clinicalService.byPatient(patientUuid!),
    enabled: Boolean(patientUuid && allowed),
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitStatus }) =>
      clinicalService.transition(id, { to: visitStatusToEncounterStatus(status) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clinical.all }),
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not update encounter");
    },
  });

  const completeMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      clinicalService.complete(id, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Visit completed and bill closed");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      const msg = ax.response?.data?.message ?? "Could not complete visit";
      toast.error(msg);
    },
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => clinicalService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Visit cancelled");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not cancel visit");
    },
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

  if (!allowed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ShieldOff className="h-10 w-10 text-[hsl(var(--clinical-emergency))]" />
          <p className="text-sm font-semibold text-foreground">Folder access restricted</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Your role ({user?.role ?? "unknown"}) does not have permission to view a patient&apos;s full clinical folder.
            Only nurses, midwives, and clinicians can access the folder. Use your module&apos;s task queue to view the
            specific request assigned to your station.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!patientUuid) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No patient selected</p>
          <p className="text-xs text-muted-foreground">
            Open a folder from <strong>Today&apos;s Visits</strong> or <strong>Patient Search</strong>.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push("/nurse?view=visits")}>
              Today&apos;s Visits
            </Button>
            <Button onClick={() => router.push("/nurse?view=search")}>
              Patient Search
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (encountersQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading patient folder…
        </CardContent>
      </Card>
    );
  }

  function changeStatus(value: VisitStatus) {
    if (!visit) return;
    transitionMut.mutate(
      { id: visit.id, status: value },
      {
        onSuccess: () =>
          toast.success("Visit status updated", {
            description: NEXT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value,
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
          Back to Visits
        </Button>
        {visit && (
          <div className="flex items-center gap-2">
            <Select key={statusSelectKey} onValueChange={(v) => onStatusSelect(v as VisitStatus)}>
              <SelectTrigger className="w-56" disabled={transitionMut.isPending}>
                <ArrowRight className="mr-1.5 h-4 w-4" />
                <SelectValue placeholder="Update visit status…" />
              </SelectTrigger>
              <SelectContent>
                {NEXT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Complete Visit
            </Button>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <PatientBanner patientId={patientUuid!} encounterId={visit?.id} />

      <div className="overflow-x-auto">
        <nav className="module-subnav">
          {FOLDER_TABS.map((t) => (
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
        {tab === "overview" && (
          <FolderVisits visits={visits} currentVisitId={visit?.id} />
        )}
        {tab === "vitals" && canVitals && (
          <FolderVitals patientId={patientPublicId} visit={visit} recordedBy={userLabel} />
        )}
        {tab === "consultations" && (
          <FolderConsultations patientId={patientPublicId} visit={visit} authoredBy={userLabel} />
        )}
        {tab === "tests" && (
          <div className="space-y-4">
            <FolderOrdersLab visit={visit} canOrder={canOrder} />
            <FolderOrdersRadiology visit={visit} canOrder={canOrder} />
          </div>
        )}
        {tab === "medicines" && (
          <FolderOrdersRx visit={visit} canOrder={canOrder} />
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
        title="Complete this visit?"
        description={
          completeVia === "button"
            ? "This closes the encounter and finalises billing where configured. Incomplete tasks may be blocked."
            : "Marks the encounter as completed (status transition). Use the toolbar button instead if you need bill auto-close workflow."
        }
        confirmLabel="Complete visit"
        pending={completeVia === "button" ? completeMut.isPending : transitionMut.isPending}
        onConfirm={async () => {
          if (!visit || !completeVia) return;
          if (completeVia === "button") {
            await completeMut.mutateAsync({ id: visit.id, force: false });
            return;
          }
          await transitionMut.mutateAsync({ id: visit.id, status: "completed" });
          toast.success("Visit marked complete", {
            description: NEXT_STATUS_OPTIONS.find((o) => o.value === "completed")?.label ?? "completed",
          });
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen && Boolean(visit)}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setCancelReason("");
        }}
        title="Cancel this visit?"
        description="Cancellation is audited. Provide a brief reason visible to supervisors."
        confirmLabel="Cancel visit"
        destructive
        footerExtra={
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Reason for cancellation…"
          />
        }
        pending={cancelMut.isPending}
        onConfirm={async () => {
          if (!visit) return;
          const trimmed = cancelReason.trim();
          if (!trimmed) {
            toast.error("A cancellation reason is required");
            throw new Error("missing reason");
          }
          await cancelMut.mutateAsync({ id: visit.id, reason: trimmed });
        }}
      />
    </div>
  );
}
