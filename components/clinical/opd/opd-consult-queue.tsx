"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, ChevronRight, Clock, Inbox, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TRIAGE_LABELS, TRIAGE_ORDER, todayDateIso } from "@/components/nurse/lib/nurse-data";
import { encounterToVisit, mapPriority } from "@/components/clinical/lib/encounter-adapter";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { EncounterDto } from "@/types/clinical.types";

export type OpdQueueSections = "both" | "consult" | "diagnostics";

/**
 * OPD queues: consultants see patients awaiting or in consultation, plus
 * a second list for those at lab/pharmacy so visits do not “disappear”
 * after ordering tests or Rx.
 */
export function OpdConsultQueue({ sections = "both" }: { sections?: OpdQueueSections }) {
  const router = useRouter();
  const today = todayDateIso();

  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: 30_000,
  });

  const { consultRows, diagRows } = useMemo(() => {
    const encounters = todayQuery.data ?? [];
    type Row = {
      encounter: EncounterDto;
      visit: ReturnType<typeof encounterToVisit>;
      priority: ReturnType<typeof mapPriority>;
    };
    const mapRow = (e: EncounterDto): Row => ({
      encounter: e,
      visit: encounterToVisit(e),
      priority: mapPriority(e.priority),
    });
    const isTodayCalendar = (e: EncounterDto) => encounterToVisit(e).appointmentDate === today;

    const consultRaw = encounters
      .filter((e) => e.status === "AT_CONSULTATION" || e.status === "IN_CONSULTATION")
      .filter(isTodayCalendar)
      .map(mapRow)
      .sort(
        (a, b) =>
          TRIAGE_ORDER[a.priority] - TRIAGE_ORDER[b.priority] ||
          a.visit.appointmentTime.localeCompare(b.visit.appointmentTime),
      );

    const diagRaw = encounters
      .filter((e) => e.status === "AT_LAB" || e.status === "AT_PHARMACY")
      .filter(isTodayCalendar)
      .map(mapRow)
      .sort(
        (a, b) =>
          TRIAGE_ORDER[a.priority] - TRIAGE_ORDER[b.priority] ||
          a.visit.appointmentTime.localeCompare(b.visit.appointmentTime),
      );

    return { consultRows: consultRaw, diagRows: diagRaw };
  }, [todayQuery.data, today]);

  function open(encounterId: string, patientUuid: string) {
    router.push(`/nurse?view=folder&patientId=${patientUuid}&visitId=${encounterId}`);
  }

  const loading = todayQuery.isLoading;

  return (
    <div className="space-y-6">
      {(sections === "both" || sections === "consult") && (
        <QueueSection
          title={`Consult queue · ${today}`}
          description="Patients vitalled and ready for the doctor, or already in consultation. Open folder for SOAP notes and orders."
          loading={loading}
          emptyTitle="No patients waiting"
          emptyHint="Once a nurse takes vitals the patient will appear here automatically."
          rows={consultRows}
          statusLabel={(e) =>
            e.status === "IN_CONSULTATION" ? "In consultation" : "Awaiting doctor"
          }
          onOpen={open}
        />
      )}

      {(sections === "both" || sections === "diagnostics") && (
        <QueueSection
          title="At lab / pharmacy (same visit)"
          description="Patients sent for investigations or dispensing still appear here so you can reopen the folder and continue care after results."
          loading={loading}
          emptyTitle="No patients in diagnostics"
          emptyHint="When you place lab or pharmacy orders, the encounter moves here until the station completes its work."
          rows={diagRows}
          statusLabel={(e) => (e.status === "AT_LAB" ? "At lab" : "At pharmacy")}
          onOpen={open}
        />
      )}
    </div>
  );
}

function QueueSection({
  title,
  description,
  loading,
  emptyTitle,
  emptyHint,
  rows,
  statusLabel,
  onOpen,
}: {
  title: string;
  description: string;
  loading: boolean;
  emptyTitle: string;
  emptyHint: string;
  rows: Array<{
    encounter: EncounterDto;
    visit: ReturnType<typeof encounterToVisit>;
    priority: ReturnType<typeof mapPriority>;
  }>;
  statusLabel: (e: EncounterDto) => string;
  onOpen: (encounterId: string, patientUuid: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading queue…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <Inbox className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="text-xs text-muted-foreground">{emptyHint}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Time</Th>
                  <Th>Patient</Th>
                  <Th>Service</Th>
                  <Th>Reason</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ encounter, visit, priority }) => {
                  const triage = TRIAGE_LABELS[priority];
                  return (
                    <tr
                      key={encounter.id}
                      onClick={() => onOpen(encounter.id, encounter.patientId)}
                      className={`table-row-interactive ${triage.rowClass}`}
                    >
                      <td className="px-4 py-3 font-clinical text-xs text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {visit.appointmentTime}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{visit.patientName}</p>
                        <p className="patient-id mt-0.5">{visit.patientId}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{visit.serviceName}</td>
                      <td className="px-4 py-3 text-foreground">{visit.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill text-xs ${triage.badgeClass}`}>{triage.label}</span>
                      </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="status-pill status-pill-pending text-xs">
                              {statusLabel(encounter)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              At: {visit.currentStationLabel}
                            </span>
                          </div>
                        </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" className="gap-1">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>
      {children}
    </th>
  );
}
