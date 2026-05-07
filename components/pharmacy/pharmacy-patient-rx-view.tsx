"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Pill } from "lucide-react";

import { DispensePanel } from "@/components/pharmacy/pharmacy-dispense-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { PrescriptionDto } from "@/types/clinical.types";

export function PharmacyPatientRxView() {
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

  const rxQuery = useQuery({
    queryKey: encounterId ? queryKeys.clinical.prescriptions(encounterId) : ["clinical", "rx", "idle"],
    queryFn: () => clinicalService.listPrescriptionsForEncounter(encounterId),
    enabled: Boolean(encounterId),
  });

  const prescriptions = rxQuery.data ?? [];
  const [selectedRxId, setSelectedRxId] = useState<string | null>(null);
  const selectedRx = prescriptions.find((r) => r.id === selectedRxId) ?? null;

  if (!patientId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No patient selected. Use Patient Search first.</p>
          <Button variant="outline" onClick={() => router.push("/pharmacy?view=search")}>
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
        <Button variant="ghost" size="sm" onClick={() => router.push("/pharmacy?view=search")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to search
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Encounters for patient</CardTitle>
          <CardDescription>Select a visit to load prescriptions from that encounter.</CardDescription>
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
                  setSelectedRxId(null);
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
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4" />
                Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rxQuery.isLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading prescriptions…
                </div>
              ) : prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions for this encounter.</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <PrescriptionPickRow
                      key={rx.id}
                      rx={rx}
                      selected={selectedRxId === rx.id}
                      onSelect={() => setSelectedRxId(rx.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedRx ? (
            <DispensePanel rx={selectedRx} onClose={() => setSelectedRxId(null)} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Pill className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Select a prescription to open the dispensary worksheet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function PrescriptionPickRow({
  rx,
  selected,
  onSelect,
}: {
  rx: PrescriptionDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/5 ${selected ? "border-primary/50 bg-muted/40" : ""}`}
    >
      <p className="font-medium text-foreground">
        {rx.lines.length} item{rx.lines.length === 1 ? "" : "s"}
      </p>
      <p className="text-xs text-muted-foreground">
        {rx.prescribedAt ? formatDateTime(rx.prescribedAt) : ""} · {rx.status.replace(/_/g, " ").toLowerCase()} ·{" "}
        {rx.prescribedByName}
      </p>
      <p className="patient-id mt-1 text-xs">{rx.id.slice(0, 8)}…</p>
    </button>
  );
}
