"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";

import { PrescribeDialog } from "@/components/clinical/pharmacy/prescribe-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { SuccessPanel } from "@/components/common/success-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { formatClinicalDate, formatClinicalDateTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { notify } from "@/lib/notify";
import { printArea } from "@/lib/print";
import { queryKeys } from "@/lib/query-keys";
import { dayOfStay, DISCHARGE_OUTCOMES } from "@/lib/wards";
import { appointmentsService } from "@/services/appointments.service";
import { clinicalService } from "@/services/clinical.service";
import { ipdService } from "@/services/ipd.service";
import { useAuthStore } from "@/store/auth.store";
import type { AdmissionDto } from "@/types/clinical.types";

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** DOC-12 — the discharge summary: diagnoses, what was done, take-home medicines, follow-up, outcome. */
export function DischargeDialog({ admission, onClose }: { admission: AdmissionDto; onClose: () => void }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const myName = me ? `${me.firstName} ${me.lastName}`.trim() : "";
  const name = naturalName(admission.patientName);
  const encounterQuery = useQuery({ queryKey: queryKeys.clinical.encounter(admission.encounterId ?? ""), queryFn: () => clinicalService.byId(admission.encounterId!), enabled: Boolean(admission.encounterId) });

  const [diagnoses, setDiagnoses] = useState(admission.reason ?? "");
  const [codes, setCodes] = useState("");
  const [summary, setSummary] = useState("");
  const [meds, setMeds] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [book, setBook] = useState(false);
  const [followDate, setFollowDate] = useState(() => isoDay(new Date(Date.now() + 14 * 86_400_000)));
  const [outcome, setOutcome] = useState<string>("IMPROVED");
  const [deathAt, setDeathAt] = useState("");
  const [deathCause, setDeathCause] = useState("");
  const [prescribing, setPrescribing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<{ admission: AdmissionDto; note: string } | null>(null);

  const died = outcome === "DECEASED";
  const problems = [
    !summary.trim() && "Say what was done during the stay.",
    !diagnoses.trim() && "Add the final diagnosis.",
    died && !deathAt && "Enter the date and time of death.",
    died && !deathCause.trim() && "Enter the cause of death.",
    book && !died && (!followDate || followDate < isoDay(new Date())) && "Choose a follow-up date from today on.",
  ].filter(Boolean) as string[];

  const mut = useMutation({
    mutationFn: async () => {
      // Death details have no fields of their own yet (backend-gaps.md#DOC-12-death); they lead the summary.
      const deathLine = died ? `Died ${formatClinicalDateTime(new Date(deathAt).toISOString())}. Cause: ${deathCause.trim()}.\n` : "";
      const saved = await clinicalService.discharge(admission.id, {
        summary: `${deathLine}Final diagnosis: ${diagnoses.trim()}\n\n${summary.trim()}`,
        outcome,
        icd11Codes: codes.trim() || undefined,
        dischargeMedicationSummary: meds.trim() || undefined,
        followUpPlan: died ? undefined : followUp.trim() || undefined,
      });
      ipdService.noteDischarged(saved, outcome);
      let note = "";
      if (book && !died && admission.patientId) {
        const enc = encounterQuery.data;
        try {
          await appointmentsService.book({
            patientId: admission.patientId,
            scheduledFor: new Date(`${followDate}T09:00:00`).toISOString(),
            visitType: "FOLLOW_UP",
            payerType: enc?.payerType || undefined,
            nhisMemberNumber: enc?.nhisMemberNoSnapshot || undefined,
            nhisActive: enc?.payerType === "NHIS" ? enc?.nhisActiveSnapshot : undefined,
            clinicianUserId: me?.userId ?? null,
            clinicianName: myName || undefined,
            priority: "ROUTINE",
            reason: `Follow-up after ward stay: ${diagnoses.trim()}`.slice(0, 200),
          });
          note = ` Follow-up booked for ${formatClinicalDate(followDate)}.`;
        } catch {
          note = " The follow-up couldn't be booked; book it from Appointments.";
        }
      }
      return { saved, note };
    },
    onSuccess: ({ saved, note }) => {
      void qc.invalidateQueries({ queryKey: ["ipd"] });
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.activeAdmissions });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      void qc.invalidateQueries({ queryKey: ["billing"] });
      setDone({ admission: saved, note });
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  if (done) {
    const a = done.admission;
    return (
      <FormDialog
        open
        onOpenChange={(o) => !o && onClose()}
        size="lg"
        title="Discharged"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => printArea("discharge")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print discharge summary
            </Button>
          </>
        }
      >
        <SuccessPanel
          title={died ? `${name}'s discharge is recorded` : `${name} is discharged`}
          description={`${ipdService.goingHomeAvailable() && !died ? "The nurse confirms when they've left, then the bed is cleaned." : "The bed is free."}${done.note} The bill and any NHIS claim are ready for the cashier and finance.`}
        />
        <div data-print-area="discharge" className="space-y-2 rounded-lg border border-border p-4 text-sm">
          <p className="text-base font-semibold text-foreground">Discharge summary — {naturalName(a.patientName)}</p>
          <p className="text-muted-foreground">
            {a.patientPublicId} · {a.ward}
            {a.bed ? `, bed ${a.bed}` : ""} · admitted {a.admittedAt ? formatClinicalDateTime(a.admittedAt) : "—"} · discharged {a.dischargedAt ? formatClinicalDateTime(a.dischargedAt) : "—"}
          </p>
          <p>
            <span className="font-medium">Outcome:</span> {DISCHARGE_OUTCOMES.find((o) => o.code === a.dischargeOutcome)?.label ?? a.dischargeOutcome}
          </p>
          <p className="whitespace-pre-line">{a.dischargeSummary}</p>
          {a.dischargeIcd11Codes && <p className="font-clinical text-xs">Codes: {a.dischargeIcd11Codes}</p>}
          {a.dischargeMedicationSummary && (
            <p className="whitespace-pre-line">
              <span className="font-medium">Medicines to take home:</span> {a.dischargeMedicationSummary}
            </p>
          )}
          {a.followUpPlan && (
            <p className="whitespace-pre-line">
              <span className="font-medium">Follow-up:</span> {a.followUpPlan}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Discharged by {a.dischargedByName || myName}</p>
        </div>
      </FormDialog>
    );
  }

  const day = dayOfStay(admission.admittedAt);

  return (
    <>
      <FormDialog
        open
        onOpenChange={(o) => !o && !mut.isPending && onClose()}
        size="xl"
        title={`Discharge ${name}`}
        description={`${admission.ward}${admission.bed ? `, bed ${admission.bed}` : ""}${day ? ` · day ${day}` : ""}`}
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
              Cancel
            </Button>
            <Button disabled={problems.length > 0 || mut.isPending} onClick={() => setConfirm(true)}>
              {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Discharge patient
            </Button>
          </>
        }
      >
        <FormDialogSection title="Outcome" columns={1}>
          <RadioGroup value={outcome} onValueChange={setOutcome} className="grid gap-2 sm:grid-cols-3" aria-label="Outcome">
            {DISCHARGE_OUTCOMES.map((o) => (
              <ChoiceOption key={o.code}>
                <RadioGroupItem value={o.code} /> {o.label}
              </ChoiceOption>
            ))}
          </RadioGroup>
          {died && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dc-death-at">Date and time of death</Label>
                <Input id="dc-death-at" type="datetime-local" value={deathAt} onChange={(e) => setDeathAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dc-death-cause">Cause of death</Label>
                <Input id="dc-death-cause" value={deathCause} onChange={(e) => setDeathCause(e.target.value)} />
              </div>
            </div>
          )}
        </FormDialogSection>

        <FormDialogSection title="Diagnosis and stay">
          <div className="space-y-1.5">
            <Label htmlFor="dc-dx">Final diagnosis</Label>
            <Input id="dc-dx" value={diagnoses} onChange={(e) => setDiagnoses(e.target.value)} placeholder="e.g. Severe malaria" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-codes">Diagnosis codes (optional)</Label>
            <Input id="dc-codes" value={codes} onChange={(e) => setCodes(e.target.value)} className="font-clinical" placeholder="e.g. 1F40" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dc-summary">What was done</Label>
            <Textarea id="dc-summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Treatment given, key results, condition on leaving" />
          </div>
        </FormDialogSection>

        {!died && (
          <FormDialogSection title="Going home">
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="dc-meds">Medicines to take home</Label>
                {admission.encounterId && (
                  <Button size="sm" variant="secondary" onClick={() => setPrescribing(true)}>
                    Prescribe take-home medicines
                  </Button>
                )}
              </div>
              <Textarea id="dc-meds" rows={2} value={meds} onChange={(e) => setMeds(e.target.value)} placeholder="Prescribed medicines go to the pharmacy. Note anything else here." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dc-follow">Follow-up plan (optional)</Label>
              <Textarea id="dc-follow" rows={2} value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="Clinic review, warning signs to come back for" />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={book} onCheckedChange={(v) => setBook(v === true)} /> Book a follow-up visit on
              </label>
              <Input type="date" aria-label="Follow-up date" value={followDate} min={isoDay(new Date())} disabled={!book} onChange={(e) => setFollowDate(e.target.value)} className="w-44" />
            </div>
          </FormDialogSection>
        )}

        {problems.length > 0 && (summary || diagnoses !== (admission.reason ?? "")) && (
          <ul className="list-disc pl-5 text-xs text-destructive" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </FormDialog>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Discharge ${name}?`}
        description={died ? "The death is recorded and the admission is closed." : "The admission is closed and the patient can go home. The bill and any NHIS claim are prepared."}
        confirmLabel="Discharge patient"
        cancelLabel="Not yet"
        destructive={died}
        pending={mut.isPending}
        onConfirm={async () => {
          await mut.mutateAsync();
        }}
      />

      {admission.encounterId && admission.patientId && (
        <PrescribeDialog
          open={prescribing}
          onOpenChange={setPrescribing}
          encounterId={admission.encounterId}
          patientId={admission.patientId}
          patientName={name}
          payerType={encounterQuery.data?.payerType ?? "CASH"}
        />
      )}
    </>
  );
}
