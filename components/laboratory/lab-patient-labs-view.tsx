"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FlaskConical, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { LabOrderDto } from "@/types/clinical.types";

export function LaboratoryPatientLabsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const encountersQuery = useQuery({
    queryKey: patientId ? queryKeys.clinical.byPatient(patientId) : ["clinical", "encounters", "idle"],
    queryFn: () => clinicalService.byPatient(patientId!),
    enabled: Boolean(patientId),
  });

  const encounters = encountersQuery.data ?? [];
  const [encounterId, setEncounterId] = useState<string>("");

  const selectedEncounter = useMemo(
    () => encounters.find((e) => e.id === encounterId) ?? null,
    [encounters, encounterId],
  );

  const ordersQuery = useQuery({
    queryKey: encounterId ? queryKeys.clinical.labOrders(encounterId) : ["clinical", "lab-orders", "idle"],
    queryFn: () => clinicalService.listLabOrdersForEncounter(encounterId),
    enabled: Boolean(encounterId),
  });

  const orders = ordersQuery.data ?? [];

  if (!patientId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No patient selected. Use Patient Search first.</p>
          <Button variant="outline" onClick={() => router.push("/laboratory?view=search")}>
            Go to search
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (encountersQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading encounters…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/laboratory?view=search")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to search
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Encounters for patient</CardTitle>
          <CardDescription>Select a visit to see laboratory orders placed on that encounter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {encounters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No encounters on file for this patient.</p>
          ) : (
            <div className="max-w-md space-y-2">
              <label className="text-sm font-medium text-foreground">Encounter</label>
              <Select
                value={encounterId || undefined}
                onValueChange={(v) => {
                  setEncounterId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose encounter…" />
                </SelectTrigger>
                <SelectContent>
                  {encounters.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.encounterNumber} · {e.status} · {e.patientName}{" "}
                      {e.checkedInAt ? `· ${formatDateTime(e.checkedInAt)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedEncounter && (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium">{selectedEncounter.patientName}</p>
              <p className="patient-id mt-0.5">{selectedEncounter.patientPublicId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {encounterId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4" />
              Lab orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersQuery.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lab orders for this encounter.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <LabOrderRow key={o.id} order={o} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LabOrderRow({ order }: { order: LabOrderDto }) {
  const router = useRouter();

  function goResults() {
    router.push(`/laboratory?view=results&orderId=${encodeURIComponent(order.id)}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{order.serviceName}</p>
        <p className="text-xs text-muted-foreground">
          {order.orderedAt ? formatDateTime(order.orderedAt) : ""} · {order.status} · {order.priority}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={goResults}>
        Result entry
      </Button>
    </div>
  );
}
