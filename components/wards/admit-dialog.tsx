"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { useWardBoard } from "@/components/wards/use-ward-board";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { SearchablePicker } from "@/components/common/searchable-picker";
import { SuccessPanel } from "@/components/common/success-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { formatTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { bedKindLabel, wardForLabel } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import type { AdmissionDto } from "@/types/clinical.types";

interface AdmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The visit to admit from. Omit to choose one of today's visits (from the ward screens). */
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

function Body({
  onOpenChange,
  encounterId,
  patientName,
  presetWard,
  presetBed,
  reason: presetReason,
  onAdmitted,
}: AdmitDialogProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [visitId, setVisitId] = useState(encounterId ?? "");
  const [ward, setWard] = useState(presetWard ?? "");
  const [bed, setBed] = useState(presetBed ?? "");
  const [reason, setReason] = useState(presetReason ?? "");
  const [admitted, setAdmitted] = useState<AdmissionDto | null>(null);

  const board = useWardBoard();
  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    enabled: !encounterId,
  });
  const activeQuery = useQuery({
    queryKey: queryKeys.ipd.activeAdmissions,
    queryFn: () => clinicalService.activeAdmissions(),
  });

  const admittedVisits = new Set(
    (activeQuery.data ?? []).map((a) => a.encounterId),
  );
  const visits = (todayQuery.data ?? []).filter(
    (e) =>
      e.status !== "COMPLETED" &&
      e.status !== "CANCELLED" &&
      !admittedVisits.has(e.id),
  );
  const wards = board.wards;
  const chosenWard = wards.find((w) => w.name === ward);
  // The bed must still be free right now — the board refreshes, and another doctor may have just used it.
  const freeBed = chosenWard?.free.find((b) => b.label === bed) ?? null;
  const bedTaken = Boolean(bed) && Boolean(chosenWard) && !freeBed;
  const noWards = !board.isPending && !board.error && wards.length === 0;
  const name = naturalName(
    patientName ??
      visits.find((v) => v.id === visitId)?.patientName ??
      "the patient",
  );

  const admitMut = useMutation({
    mutationFn: () =>
      clinicalService.admit(visitId, {
        ward: ward.trim(),
        bed: bed.trim() || undefined,
        reason: reason.trim() || undefined,
        // Server beds carry an id the backend checks for occupancy; browser-set-up beds don't.
        bedId: freeBed && !board.sample ? freeBed.id : undefined,
      }),
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.wards });
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
                else
                  router.push(
                    `/wards?view=admission&admissionId=${admitted.id}`,
                  );
              }}
            >
              Go to ward
            </Button>
          </>
        }
      >
        <SuccessPanel
          title={`${naturalName(admitted.patientName)} is admitted`}
          description={`${admitted.ward}${admitted.bed ? `, bed ${admitted.bed}` : ""}. The ward team can see them now.`}
        />
      </FormDialog>
    );
  }

  const ready =
    Boolean(visitId) && Boolean(ward.trim()) && (noWards || Boolean(freeBed));

  return (
    <FormDialog
      open
      onOpenChange={(o) => !admitMut.isPending && onOpenChange(o)}
      size="lg"
      title={encounterId ? `Admit ${name}` : "Admit a patient"}
      description="Choose the ward and a free bed. The visit is marked as admitted and the ward team takes over."
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={admitMut.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={!ready || admitMut.isPending}
            onClick={() => admitMut.mutate()}
          >
            {admitMut.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Admit to ward
          </Button>
        </>
      }
    >
      {!encounterId && (
        <FormDialogSection title="Patient" columns={1}>
          <div className="space-y-1.5">
            <Label htmlFor="admit-visit">Today&apos;s visit</Label>
            <SearchablePicker
              id="admit-visit"
              value={visitId}
              onChange={setVisitId}
              loading={todayQuery.isPending}
              placeholder="Choose the patient"
              searchPlaceholder="Name, hospital number or reason"
              emptyText="No one matches. Only today's visits that aren't on a ward are listed."
              options={visits.map((v) => ({
                value: v.id,
                label: naturalName(v.patientName),
                description: [
                  v.patientPublicId,
                  v.reason,
                  v.checkedInAt ? `arrived ${formatTime(v.checkedInAt)}` : "",
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
            {todayQuery.isError && (
              <p className="text-xs text-destructive">
                {getFriendlyError(todayQuery.error).message}
              </p>
            )}
          </div>
        </FormDialogSection>
      )}

      <FormDialogSection title="Ward and bed">
        {board.error && (
          <InlineNotice tone="error">
            {getFriendlyError(board.error).message}
          </InlineNotice>
        )}
        {noWards ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="admit-ward">Ward</Label>
              <Input
                id="admit-ward"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="e.g. Male Medical Ward"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admit-bed">Bed (optional)</Label>
              <Input
                id="admit-bed"
                value={bed}
                onChange={(e) => setBed(e.target.value)}
                className="font-clinical"
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              No wards are set up yet, so type the ward and bed.
            </p>
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
                  <SelectValue
                    placeholder={
                      board.isPending ? "Loading wards…" : "Choose a ward"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {wards.map((w) => (
                    <SelectItem
                      key={w.id}
                      value={w.name}
                      disabled={w.free.length === 0}
                    >
                      {w.name} ·{" "}
                      {w.free.length === 0 ? "full" : `${w.free.length} free`}
                      {w.for !== "MIXED" ? ` · ${wardForLabel(w.for)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admit-bed">Bed</Label>
              <SearchablePicker
                id="admit-bed"
                value={freeBed ? bed : ""}
                onChange={setBed}
                disabled={!chosenWard}
                placeholder={
                  chosenWard ? "Choose a free bed" : "Choose the ward first"
                }
                searchPlaceholder="Bed number"
                emptyText="No free bed matches."
                options={(chosenWard?.free ?? []).map((b) => ({
                  value: b.label,
                  label: b.label,
                  description:
                    b.kind !== "STANDARD" ? bedKindLabel(b.kind) : undefined,
                }))}
              />
              {bedTaken && (
                <p className="text-xs text-destructive">
                  Bed {bed} has just been taken. Choose another free bed.
                </p>
              )}
            </div>
          </>
        )}
      </FormDialogSection>

      <FormDialogSection title="Why" columns={1}>
        <div className="space-y-1.5">
          <Label htmlFor="admit-reason">Working diagnosis and reason</Label>
          <Textarea
            id="admit-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Severe malaria, needs IV artesunate"
          />
        </div>
      </FormDialogSection>
    </FormDialog>
  );
}
