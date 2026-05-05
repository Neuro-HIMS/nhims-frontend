"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FolderOpen, MoreHorizontal, ArrowRight, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/store/auth.store";
import { useEncountersStore } from "@/store/encounters.store";
import { canViewFullFolder, canPlaceOrders, canRecordVitals } from "@/lib/permissions";
import { FolderHeader } from "@/components/nurse/folder/folder-header";
import { FolderVisits } from "@/components/nurse/folder/folder-visits";
import { FolderVitals } from "@/components/nurse/folder/folder-vitals";
import { FolderConsultations } from "@/components/nurse/folder/folder-consultations";
import { FolderTreatments } from "@/components/nurse/folder/folder-treatments";
import { FolderAdmissions } from "@/components/nurse/folder/folder-admissions";
import { FolderReferrals } from "@/components/nurse/folder/folder-referrals";
import { FolderAlerts } from "@/components/nurse/folder/folder-alerts";
import { FolderOrders } from "@/components/nurse/folder/folder-orders";
import { FolderBilling } from "@/components/nurse/folder/folder-billing";
import type { VisitStatus } from "@/lib/clinical-types";

const FOLDER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "vitals", label: "Vitals" },
  { id: "consultations", label: "Consultations" },
  { id: "orders", label: "Orders & Results" },
  { id: "treatments", label: "Treatments" },
  { id: "admissions", label: "Admissions" },
  { id: "referrals", label: "Referrals" },
  { id: "alerts", label: "Medical Alerts" },
  { id: "billing", label: "Billing" },
] as const;

type FolderTab = (typeof FOLDER_TABS)[number]["id"];

const NEXT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: "in-triage", label: "Mark: In Triage" },
  { value: "in-vitals", label: "Mark: Recording Vitals" },
  { value: "awaiting-consultation", label: "Send to Consultation" },
  { value: "awaiting-lab", label: "Send to Laboratory" },
  { value: "awaiting-pharmacy", label: "Send to Pharmacy" },
  { value: "completed", label: "Complete Visit" },
  { value: "cancelled", label: "Cancel Visit" },
];

export function PatientFolderView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const visitIdParam = searchParams.get("visitId");

  const visits = useEncountersStore((s) => s.visits);
  const updateVisitStatus = useEncountersStore((s) => s.updateVisitStatus);
  const user = useAuthStore((s) => s.user);
  const userLabel = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.username || user.email
    : "Nurse on Duty";

  const allowed = canViewFullFolder(user?.role);
  const canOrder = canPlaceOrders(user?.role);
  const canVitals = canRecordVitals(user?.role);

  const [tab, setTab] = useState<FolderTab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const visit = useMemo(() => {
    if (!patientId) return null;
    if (visitIdParam) {
      return visits.find((v) => v.id === visitIdParam) ?? null;
    }
    // Fall back to most recent visit for this patient.
    const list = visits
      .filter((v) => v.patientId === patientId)
      .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.appointmentTime.localeCompare(a.appointmentTime));
    return list[0] ?? null;
  }, [patientId, visitIdParam, visits]);

  if (!allowed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ShieldOff className="h-10 w-10 text-[hsl(var(--clinical-emergency))]" />
          <p className="text-sm font-semibold text-foreground">Folder access restricted</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Your role ({user?.role ?? "unknown"}) does not have permission to view a patient's full clinical folder.
            Only nurses, midwives, and clinicians can access the folder. Use your module's task queue to view the
            specific request assigned to your station.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!patientId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No patient selected</p>
          <p className="text-xs text-muted-foreground">
            Open a folder from <strong>Today's Visits</strong> or <strong>Patient Search</strong>.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push("/nurse?view=visits")}>
              Today's Visits
            </Button>
            <Button onClick={() => router.push("/nurse?view=search")}>
              Patient Search
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function changeStatus(value: VisitStatus) {
    if (!visit) return;
    updateVisitStatus(visit.id, value);
    toast.success("Visit status updated", {
      description: NEXT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value,
    });
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
            <Select onValueChange={(v) => changeStatus(v as VisitStatus)}>
              <SelectTrigger className="w-56">
                <ArrowRight className="mr-1.5 h-4 w-4" />
                <SelectValue placeholder="Update visit status…" />
              </SelectTrigger>
              <SelectContent>
                {NEXT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <FolderHeader patientId={patientId} visit={visit} key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />

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
          <FolderVisits patientId={patientId} currentVisitId={visit?.id} />
        )}
        {tab === "vitals" && canVitals && (
          <FolderVitals patientId={patientId} visit={visit} recordedBy={userLabel} />
        )}
        {tab === "consultations" && (
          <FolderConsultations patientId={patientId} visit={visit} authoredBy={userLabel} />
        )}
        {tab === "orders" && (
          <FolderOrders patientId={patientId} visit={visit} user={userLabel} canOrder={canOrder} />
        )}
        {tab === "treatments" && (
          <FolderTreatments patientId={patientId} visit={visit} prescribedBy={userLabel} />
        )}
        {tab === "admissions" && (
          <FolderAdmissions patientId={patientId} visit={visit} user={userLabel} />
        )}
        {tab === "referrals" && (
          <FolderReferrals patientId={patientId} visit={visit} user={userLabel} />
        )}
        {tab === "alerts" && (
          <FolderAlerts patientId={patientId} user={userLabel} />
        )}
        {tab === "billing" && (
          <FolderBilling patientId={patientId} />
        )}
      </div>
    </div>
  );
}
