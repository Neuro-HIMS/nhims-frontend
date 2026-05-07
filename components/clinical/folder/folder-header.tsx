"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateAge, STATUS_LABEL, TRIAGE_LABELS } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { Visit } from "@/lib/clinical-types";

interface FolderHeaderProps {
  patientUuid: string;
  patientPublicId: string;
  visit: Visit | null;
  visits: Visit[];
  onRefresh: () => void;
}

export function FolderHeader({ patientUuid, patientPublicId, visit, visits, onRefresh }: FolderHeaderProps) {
  const alertsQuery = useQuery({
    queryKey: patientUuid ? queryKeys.clinical.alerts(patientUuid) : ["clinical", "alerts", "idle"],
    queryFn: () => clinicalService.listAlerts(patientUuid),
    enabled: Boolean(patientUuid),
  });
  const alerts = alertsQuery.data ?? [];

  const previousVisitCount = visits.length;
  const headerVisit = visit ?? visits[0];

  if (!headerVisit) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patient
            </p>
            <p className="font-medium text-foreground">
              No visit on record for {patientPublicId || "this patient"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const triage = TRIAGE_LABELS[headerVisit.priority];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-[hsl(var(--notice-info-bg))] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--notice-info-foreground))]">
              Visit / Attendance Information
            </p>
            <span className={`status-pill text-xs ${triage.badgeClass}`}>{triage.label}</span>
            <span className="status-pill status-pill-pending text-xs">
              {STATUS_LABEL[headerVisit.status]}
            </span>
            <span className="status-pill text-xs border border-border bg-muted/40">
              Currently at: {headerVisit.currentStationLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Previous Visits: <span className="font-clinical font-semibold text-foreground">{previousVisitCount}</span>
            </span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh Patient Folder
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={headerVisit.patientName} bold />
          <Field label="Patient No." value={headerVisit.patientId} mono />
          <Field label="Type" value={headerVisit.visitType.toUpperCase()} />
          <Field label="Gender" value={headerVisit.patientSex === "M" ? "Male" : "Female"} />
          <Field label="Date of Birth" value={headerVisit.patientDob} />
          <Field label="Age" value={calculateAge(headerVisit.patientDob)} />
          <Field label="Contact" value={headerVisit.patientPhone} mono />
          <Field label="Visit No." value={headerVisit.visitNo} mono />
          <Field label="Visit Date" value={`${headerVisit.appointmentDate} ${headerVisit.appointmentTime}`} />
          <Field label="Sponsor" value={headerVisit.sponsor} bold />
          <Field label="Scheme" value={headerVisit.scheme} />
          <Field label="Doctor" value={headerVisit.clinicianName} bold />
          <Field label="Department" value={headerVisit.department} />
          <Field label="Service" value={headerVisit.serviceName} />
          <Field label="Fee" value={`GHS ${headerVisit.fee.toFixed(2)}`} mono />
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alert-critical flex items-start gap-3 rounded-lg border px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider">Medical Alerts</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {alerts.map((a) => (
                <li key={a.id}>
                  <span className="font-medium">{a.label}</span>
                  {a.notes ? <span className="opacity-80"> — {a.notes}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}:</span>
      <span
        className={`text-sm ${bold ? "font-semibold text-foreground" : "text-foreground"} ${
          mono ? "font-clinical" : ""
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
