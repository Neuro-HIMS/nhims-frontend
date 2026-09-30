"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CriticalAlert } from "@/components/clinical/critical-alert";
import { getFriendlyError } from "@/lib/api-errors";
import { storedFlag } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

/**
 * DOC-08 — open critical lab results for this visit, pinned at the top of the patient page.
 * They stay until a doctor says they've seen them (the acknowledgement is recorded and the lab's
 * "Critical today" list updates).
 */
export function CriticalResults({ encounterId }: { encounterId: string }) {
  const qc = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: queryKeys.clinical.labOrders(encounterId),
    queryFn: () => clinicalService.listLabOrdersForEncounter(encounterId),
  });
  const labOrders = ordersQuery.data ?? [];
  const inboxQuery = useQuery({
    queryKey: queryKeys.clinical.labCriticalInbox,
    queryFn: () => clinicalService.labCriticalAlertsInbox(),
    refetchInterval: 30_000,
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => clinicalService.acknowledgeLabCriticalAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.labCriticalInbox });
      toast.success("Recorded that you've seen the critical result.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const alerts = (inboxQuery.data ?? []).filter((a) => a.encounterId === encounterId && a.status === "OPEN");
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const order = labOrders.find((o) => o.id === a.labOrderId);
        const values = (order?.results ?? [])
          .filter((r) => storedFlag(r.flag) === "CRITICAL")
          .map((r) => `${r.analyte} ${r.value}${r.units ? ` ${r.units}` : ""}${r.referenceRange ? ` (normal ${r.referenceRange})` : ""}`);
        const detail = values.length ? values.join("; ") : a.summary.replace(/^Critical:\s*/i, "");
        return (
          <CriticalAlert
            key={a.id}
            title={`Critical result: ${detail}`}
            body={`${a.serviceName}. Look at the full result under Tests and act now — order more tests, change medicines or admit.`}
            acknowledgeLabel="I've seen this"
            onAcknowledge={() => ackMut.mutateAsync(a.id).then(() => undefined)}
          />
        );
      })}
    </div>
  );
}
