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

/**
 * Minimal OPD doctor queue. Lists today's encounters that have been
 * triaged + had vitals taken (status = AT_CONSULTATION) and ones the
 * doctor is already actively consulting (IN_CONSULTATION). Selecting an
 * encounter routes to the existing patient folder where the doctor
 * records consultation notes, places lab/Rx orders, and triggers the
 * next station transition.
 */
export function OpdConsultQueue() {
  const router = useRouter();
  const today = todayDateIso();

  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: 30_000,
  });

  const rows = useMemo(() => {
    return (todayQuery.data ?? [])
      .filter((e) => e.status === "AT_CONSULTATION" || e.status === "IN_CONSULTATION")
      .map((e) => ({ encounter: e, visit: encounterToVisit(e), priority: mapPriority(e.priority) }))
      .sort(
        (a, b) =>
          TRIAGE_ORDER[a.priority] - TRIAGE_ORDER[b.priority] ||
          a.visit.appointmentTime.localeCompare(b.visit.appointmentTime),
      );
  }, [todayQuery.data]);

  function open(encounterId: string, patientUuid: string) {
    router.push(`/nurse?view=folder&patientId=${patientUuid}&visitId=${encounterId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          OPD Consultation Queue · {today}
        </CardTitle>
        <CardDescription>
          Patients vitalled by the nurse station and ready for the doctor. Open the folder to record SOAP notes, place orders, or
          send to lab/pharmacy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {todayQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading queue…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <Inbox className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No patients waiting</p>
            <p className="text-xs text-muted-foreground">
              Once a nurse takes vitals the patient will appear here automatically.
            </p>
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
                      onClick={() => open(encounter.id, encounter.patientId)}
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
                        <span className="status-pill status-pill-pending text-xs">
                          {encounter.status === "IN_CONSULTATION" ? "In Consultation" : "Awaiting Doctor"}
                        </span>
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
