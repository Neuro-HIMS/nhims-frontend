"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { SuccessPanel } from "@/components/common/success-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { naturalName } from "@/lib/display-name";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { bedKey } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import { ipdService } from "@/services/ipd.service";
import type { AdmissionDto } from "@/types/clinical.types";

interface AdmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The visit to admit from. Omit to choose one of today's visits (from the bed board). */
  encounterId?: string;
  patientName?: string;
  /** Pre-chosen bed (bed board → "Admit a patient here"). */
  presetWard?: string;
  presetBed?: string;
  /** Working diagnosis / reason, pre-filled. */
  reason?: string;
  /** Where "Go to ward" leads; defaults to the admission page. */
  onAdmitted?: (a: AdmissionDto) => void;
}

/** DOC-10 — admit a patient to a free bed. */
export function AdmitDialog(props: AdmitDialogProps) {
  // Mounted per open so each admission starts clean.
  if (!props.open) return null;
  return <Body {...props} />;
}

function Body({ onOpenChange, encounterId, patientName, presetWard, presetBed, reason: presetReason, onAdmitted }: AdmitDialogProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [visitId, setVisitId] = useState(encounterId ?? "");
  const [ward, setWard] = useState(presetWard ?? "");
  const [bed, setBed] = useState(presetBed ?? "");
  const [reason, setReason] = useState(presetReason ?? "");
  const [admitted, setAdmitted] = useState<AdmissionDto | null>(null);

  const activeQuery = useQuery({ queryKey: queryKeys.ipd.activeAdmissions, queryFn: () => clinicalService.activeAdmissions() });
  const boardQuery = useQuery({
    queryKey: [...queryKeys.ipd.wards, "screen"],
    queryFn: () => ipdService.boardForScreen(activeQuery.data ?? []),
    enabled: activeQuery.isSuccess,
  });
  const todayQuery = useQuery({ queryKey: queryKeys.clinical.today, queryFn: () => clinicalService.today(), enabled: !encounterId });

  const admittedVisits = new Set((activeQuery.data ?? []).map((a) => a.encounterId));
  const visits = (todayQuery.data ?? []).filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !admittedVisits.has(e.id));
  const cleaning = new Set(ipdService.cleaningBeds());
  const wards = useMemo(
    () =>
      (boardQuery.data?.board.wards ?? []).map((w) => ({
        ...w,
        free: w.beds.filter((b) => !b.occupied && !cleaning.has(bedKey(w.name, b.label))),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardQuery.data],
  );
  const chosenWard = wards.find((w) => w.name === ward);
  const freeBed = chosenWard?.free.find((b) => b.label === bed);
  const noWards = boardQuery.isSuccess && wards.length === 0;
  const name = naturalName(patientName ?? visits.find((v) => v.id === visitId)?.patientName ?? "the patient");

  const admitMut = useMutation({
    mutationFn: () =>
      clinicalService.admit(visitId, {
        ward: ward.trim(),
        bed: bed.trim() || undefined,
        reason: reason.trim() || undefined,
        // Catalogue beds carry an id; sample beds don't.
        bedId: freeBed && !freeBed.id.startsWith("sample-") ? freeBed.id : undefined,
      }),
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: ["ipd"] });
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.activeAdmissions });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      setAdmitted(a);
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  if (admitted) {
    return (
      <FormDialog
        open
        onOpenChange={onOpenChange}
        size="md"
        title="Admitted"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                if (onAdmitted) onAdmitted(admitted);
                else router.push(`/wards?view=admission&admissionId=${admitted.id}`);
              }}
            >
              Go to ward
            </Button>
          </>
        }
      >
        <SuccessPanel title={`${naturalName(admitted.patientName)} is admitted`} description={`${admitted.ward}${admitted.bed ? `, bed ${admitted.bed}` : ""}. The ward team can see them now.`} />
      </FormDialog>
    );
  }

  const ready = Boolean(visitId) && Boolean(ward.trim()) && (noWards || Boolean(bed));

  return (
    <FormDialog
      open
      onOpenChange={(o) => !admitMut.isPending && onOpenChange(o)}
      size="lg"
      title={encounterId ? `Admit ${name}` : "Admit a patient"}
      description="Choose the ward and a free bed. The visit is marked as admitted and the ward team takes over."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={admitMut.isPending}>
            Cancel
          </Button>
          <Button disabled={!ready || admitMut.isPending} onClick={() => admitMut.mutate()}>
            {admitMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Admit to ward
          </Button>
        </>
      }
    >
      {!encounterId && (
        <FormDialogSection title="Patient" columns={1}>
          <div className="space-y-1.5">
            <Label htmlFor="admit-visit">Today&apos;s visit</Label>
            <Select value={visitId} onValueChange={setVisitId}>
              <SelectTrigger id="admit-visit" className="w-full">
                <SelectValue placeholder={todayQuery.isPending ? "Loading today's patients…" : "Choose the patient"} />
              </SelectTrigger>
              <SelectContent>
                {visits.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {naturalName(v.patientName)} · {v.patientPublicId}
                    {v.reason ? ` · ${v.reason}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {todayQuery.isSuccess && visits.length === 0 && <p className="text-xs text-muted-foreground">No one seen today is waiting to be admitted. Admit from the patient&apos;s visit instead.</p>}
          </div>
        </FormDialogSection>
      )}

      <FormDialogSection title="Ward and bed">
        {boardQuery.isError && <InlineNotice tone="error">{getFriendlyError(boardQuery.error).message}</InlineNotice>}
        {noWards ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="admit-ward">Ward</Label>
              <Input id="admit-ward" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Male Medical Ward" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admit-bed">Bed (optional)</Label>
              <Input id="admit-bed" value={bed} onChange={(e) => setBed(e.target.value)} className="font-clinical" />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">No wards are set up yet, so type the ward and bed.</p>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="admit-ward">Ward</Label>
              <Select
                value={ward}
                onValueChange={(v) => {
                  setWard(v);
                  setBed("");
                }}
              >
                <SelectTrigger id="admit-ward" className="w-full">
                  <SelectValue placeholder={boardQuery.isPending ? "Loading wards…" : "Choose a ward"} />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.id} value={w.name} disabled={w.free.length === 0}>
                      {w.name} · {w.free.length === 0 ? "full" : `${w.free.length} free`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admit-bed">Bed</Label>
              <Select value={bed} onValueChange={setBed} disabled={!chosenWard}>
                <SelectTrigger id="admit-bed" className="w-full">
                  <SelectValue placeholder={chosenWard ? "Choose a free bed" : "Choose the ward first"} />
                </SelectTrigger>
                <SelectContent>
                  {(chosenWard?.free ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.label}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {boardQuery.data?.sample && <p className="text-xs text-muted-foreground sm:col-span-2">Sample wards: this hospital&apos;s wards aren&apos;t set up yet.</p>}
          </>
        )}
      </FormDialogSection>

      <FormDialogSection title="Why" columns={1}>
        <div className="space-y-1.5">
          <Label htmlFor="admit-reason">Working diagnosis and reason</Label>
          <Textarea id="admit-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Severe malaria, needs IV artesunate" />
        </div>
      </FormDialogSection>
    </FormDialog>
  );
}
