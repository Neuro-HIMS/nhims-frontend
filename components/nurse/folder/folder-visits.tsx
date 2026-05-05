"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEncountersStore } from "@/store/encounters.store";
import { STATUS_LABEL, TRIAGE_LABELS } from "@/components/nurse/lib/nurse-data";

interface FolderVisitsProps {
  patientId: string;
  currentVisitId?: string;
}

export function FolderVisits({ patientId, currentVisitId }: FolderVisitsProps) {
  const router = useRouter();
  const visits = useEncountersStore((s) => s.visits);

  const list = useMemo(
    () => visits.filter((v) => v.patientId === patientId).sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.appointmentTime.localeCompare(a.appointmentTime)),
    [visits, patientId]
  );

  function open(visitId: string) {
    router.push(`/nurse?view=folder&patientId=${patientId}&visitId=${visitId}`);
  }

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
    <Card>
      <CardContent className="px-0 py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>Date / Time</Th>
              <Th>Visit No.</Th>
              <Th>Service / Department</Th>
              <Th>Reason</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((v) => {
              const triage = TRIAGE_LABELS[v.priority];
              const isCurrent = v.id === currentVisitId;
              return (
                <tr
                  key={v.id}
                  className={`table-row-interactive ${isCurrent ? "bg-[hsl(var(--notice-info-bg))]" : ""}`}
                  onClick={() => open(v.id)}
                >
                  <td className="px-3 py-2.5 text-foreground">
                    <p className="font-clinical">{v.appointmentDate}</p>
                    <p className="patient-id mt-0.5">{v.appointmentTime}</p>
                  </td>
                  <td className="px-3 py-2.5 font-clinical text-xs">{v.visitNo}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-foreground">{v.serviceName}</p>
                    <p className="patient-id mt-0.5">{v.department}</p>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{v.reason}</td>
                  <td className="px-3 py-2.5">
                    <span className={`status-pill text-xs ${triage.badgeClass}`}>{triage.label}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="status-pill status-pill-pending text-xs">{STATUS_LABEL[v.status]}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="ghost">
                      {isCurrent ? "Current" : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</th>;
}
