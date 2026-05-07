"use client";

import { useMemo } from "react";
import { CalendarClock, History } from "lucide-react";

import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABEL, TRIAGE_LABELS } from "@/components/nurse/lib/nurse-data";
import type { Visit } from "@/lib/clinical-types";

interface FolderVisitsProps {
  visits: Visit[];
  currentVisitId?: string;
  onSelect?: (visitId: string) => void;
}

export function FolderVisits({ visits, currentVisitId, onSelect }: FolderVisitsProps) {
  const list = useMemo(
    () =>
      [...visits].sort(
        (a, b) =>
          b.appointmentDate.localeCompare(a.appointmentDate) ||
          b.appointmentTime.localeCompare(a.appointmentTime),
      ),
    [visits],
  );

  if (list.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <History className="h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No visits on record for this patient.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <FolderRecordFeedBanner>
        Pick <strong>Open folder</strong> to load that encounter into the chart. Expand a row for scheduling, sponsor,
        and clinician details captured on the visit.
      </FolderRecordFeedBanner>
      {list.map((v, idx) => {
        const triage = TRIAGE_LABELS[v.priority];
        const isCurrent = v.id === currentVisitId;
        return (
          <FolderRecordExpandableRow
            key={v.id}
            railIndex={list.length - idx}
            icon={CalendarClock}
            eyebrow="Encounter / visit"
            title={
              <span>
                <span className="font-clinical">{v.visitNo}</span>
                <span className="text-muted-foreground"> · </span>
                {v.serviceName}
              </span>
            }
            preview={
              <span>
                {v.appointmentDate} · {v.appointmentTime} · {v.department}
              </span>
            }
            cardClassName={isCurrent ? "border-[hsl(var(--notice-info-border))] bg-[hsl(var(--notice-info-bg))]/35" : undefined}
            badges={
              <>
                <span className={`status-pill text-xs ${triage.badgeClass}`}>{triage.label}</span>
                <span className="status-pill status-pill-pending text-xs">{STATUS_LABEL[v.status]}</span>
                {isCurrent ? (
                  <span className="status-pill text-xs border-[hsl(var(--notice-info-border))] bg-background">
                    Current chart
                  </span>
                ) : null}
              </>
            }
            headerActions={
              <Button size="sm" variant={isCurrent ? "secondary" : "outline"} onClick={() => onSelect?.(v.id)}>
                {isCurrent ? "Loaded" : "Open folder"}
              </Button>
            }
          >
            <div className="space-y-3">
              <FolderRecordField label="Visit number" value={v.visitNo} />
              <FolderRecordField label="Patient" value={`${v.patientName} (${v.patientSex})`} />
              <FolderRecordField label="Scheduled" value={`${v.appointmentDate} · ${v.appointmentTime}`} />
              <FolderRecordField label="Visit type" value={v.visitType.toUpperCase()} />
              <FolderRecordField label="Department" value={v.department} />
              <FolderRecordField label="Assigned clinician" value={v.clinicianName || null} />
              <FolderRecordField label="Reason for visit" value={v.reason?.trim() || null} />
              <FolderRecordField label="Sponsor / payer snapshot" value={v.sponsor?.trim() || null} />
              <FolderRecordField label="Scheme" value={v.scheme?.trim() || null} />
              <FolderRecordField label="Fee recorded" value={v.fee != null ? `${v.fee.toFixed(2)}` : null} />
              <FolderRecordField label="Workflow status" value={STATUS_LABEL[v.status]} />
            </div>
          </FolderRecordExpandableRow>
        );
      })}
    </div>
  );
}
