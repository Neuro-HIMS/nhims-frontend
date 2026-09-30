"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { FolderAdmissions } from "@/components/clinical/folder/folder-admissions";
import { FolderReferrals } from "@/components/clinical/folder/folder-referrals";
import { encounterToVisit } from "@/components/clinical/lib/encounter-adapter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceOption } from "@/components/ui/choice-option";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { appointmentsService } from "@/services/appointments.service";
import { clinicalService } from "@/services/clinical.service";
import type { FolderViewDto } from "@/types/clinical.types";

type NextStep = "home" | "refer" | "admit" | "wait";

const OPTIONS: Array<{ value: NextStep; label: string; hint: string }> = [
  { value: "home", label: "Send home", hint: "Finish the visit" },
  { value: "wait", label: "Wait for results", hint: "Keep the visit open" },
  { value: "refer", label: "Refer", hint: "To another doctor or hospital" },
  { value: "admit", label: "Admit", hint: "To a ward" },
];

const LAB_DONE = new Set(["AUTHORISED", "COMPLETED", "CANCELLED"]);
const RX_DONE = new Set(["DISPENSED", "CANCELLED"]);

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/** The backend's own list of unfinished work, in plain words. */
function describeBlocker(raw: string): string {
  const lab = raw.match(/(\d+)\s+open lab order/i);
  if (lab) return `${lab[1]} lab test${lab[1] === "1" ? " isn't" : "s aren't"} finished yet.`;
  const rx = raw.match(/(\d+)\s+open prescription/i);
  if (rx) return `${rx[1]} prescription${rx[1] === "1" ? " hasn't" : "s haven't"} been given at the pharmacy yet.`;
  return "Some work on this visit isn't finished yet.";
}

class NotSaved extends Error {}

interface NextStepCardProps {
  folder: FolderViewDto;
  /** "First Surname", for sentences. */
  patientName: string;
  me: { userId: string; name: string } | null;
  mainDiagnosis: string | null;
  /** Saves the notes if needed (adding `extraPlan` to the Plan). Resolves false — and explains why — when it can't. */
  ensureNotesSaved: (extraPlan?: string) => Promise<boolean>;
  /** Called after the visit leaves the doctor (finished, sent to pharmacy, waiting for results). */
  onLeftDoctor: () => void;
}

/** DOC-13 — decide what happens next, book a follow-up, and finish the visit. */
export function NextStepCard({ folder, patientName, me, mainDiagnosis, ensureNotesSaved, onLeftDoctor }: NextStepCardProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const encounter = folder.encounter;
  const visit = encounterToVisit(encounter);
  const name = patientName;

  const [step, setStep] = useState<NextStep>("home");
  const [bookFollowUp, setBookFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(inDays(14));
  const [forceOpen, setForceOpen] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [serverBlockers, setServerBlockers] = useState<string[]>([]);

  const openLabs = folder.labOrders.filter((o) => !LAB_DONE.has(o.status));
  const openRx = folder.prescriptions.filter((p) => !RX_DONE.has(p.status));
  const localThings = openLabs.map((o) => `Lab result for ${o.serviceName} isn't back yet.`);
  const thingsToFinish = localThings.length > 0 ? localThings : serverBlockers;
  const medicinesToCollect = openRx.flatMap((p) => p.lines.map((l) => l.drugName)).filter(Boolean);
  const sendsToPharmacy = openRx.length > 0 && openLabs.length === 0;

  const followUpProblem =
    bookFollowUp && step === "home"
      ? !followUpDate
        ? "Choose a date for the follow-up."
        : followUpDate < isoDay(new Date())
          ? "The follow-up date can't be in the past."
          : null
      : null;

  function afterLeaving(message: string) {
    qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
    qc.invalidateQueries({ queryKey: queryKeys.opd.queue });
    qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    toast.success(message);
    onLeftDoctor();
    router.push("/opd?view=queue");
  }

  /** Books the follow-up on its own, so a booking problem never hides that the visit itself was finished. */
  async function followUpSentence(): Promise<string> {
    if (!bookFollowUp || step !== "home") return "";
    try {
      await appointmentsService.book({
        patientId: encounter.patientId,
        scheduledFor: new Date(`${followUpDate}T09:00:00`).toISOString(),
        visitType: "FOLLOW_UP",
        payerType: encounter.payerType || undefined,
        nhisMemberNumber: encounter.nhisMemberNoSnapshot || undefined,
        nhisActive: encounter.payerType === "NHIS" ? encounter.nhisActiveSnapshot : undefined,
        clinicianUserId: me?.userId ?? null,
        clinicianName: me?.name,
        priority: "ROUTINE",
        reason: mainDiagnosis ? `Follow-up: ${mainDiagnosis}` : "Follow-up",
      });
      const [y, m, d] = followUpDate.split("-");
      return ` Follow-up booked for ${d}/${m}/${y}.`;
    } catch {
      return " The follow-up couldn't be booked — book it from Appointments.";
    }
  }

  const finishMut = useMutation({
    mutationFn: async ({ force, reason }: { force: boolean; reason?: string }) => {
      if (!(await ensureNotesSaved(reason ? `Visit finished before results were back: ${reason}` : undefined))) {
        throw new NotSaved();
      }
      if (!force && sendsToPharmacy) {
        await clinicalService.transition(encounter.id, { to: "AT_PHARMACY", station: "PHARMACY" });
        return `${name} is now waiting at the pharmacy.${await followUpSentence()}`;
      }
      await clinicalService.complete(encounter.id, force);
      return `${name}'s visit is finished.${await followUpSentence()}`;
    },
    onSuccess: (message) => {
      setForceOpen(false);
      afterLeaving(message);
    },
    onError: async (e) => {
      if (e instanceof NotSaved) return; // ensureNotesSaved already said what's missing
      // The backend refused because work is still open (e.g. a scan we don't list here): show what, and offer "Finish anyway".
      try {
        const blockers = await clinicalService.blockers(encounter.id);
        if (blockers.length > 0) {
          setServerBlockers(blockers.map(describeBlocker));
          return;
        }
      } catch {
        /* fall through to the friendly error */
      }
      toast.error(getFriendlyError(e).message);
    },
  });

  const waitMut = useMutation({
    mutationFn: async () => {
      if (!(await ensureNotesSaved())) throw new NotSaved();
      return clinicalService.transition(encounter.id, { to: "AT_LAB", station: "LAB" });
    },
    onSuccess: () => afterLeaving(`${name} is waiting for results. They'll show under Waiting for results when ready.`),
    onError: (e) => {
      if (!(e instanceof NotSaved)) toast.error(getFriendlyError(e).message);
    },
  });

  const busy = finishMut.isPending || waitMut.isPending;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Next step</h2>
        <p className="text-xs text-muted-foreground">What happens to {name} after this consultation?</p>
      </div>

      <RadioGroup
        aria-label="Next step"
        value={step}
        onValueChange={(v) => setStep(v as NextStep)}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {OPTIONS.map((o) => (
          <ChoiceOption key={o.value}>
            <RadioGroupItem value={o.value} />
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs font-normal text-muted-foreground">{o.hint}</span>
            </span>
          </ChoiceOption>
        ))}
      </RadioGroup>

      {step === "home" && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Checkbox checked={bookFollowUp} onCheckedChange={(v) => setBookFollowUp(v === true)} />
              Book a follow-up visit
            </label>
            {bookFollowUp && (
              <div className="space-y-1.5 pl-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">On</span>
                  <DatePickerField
                    id="follow-up-date"
                    value={followUpDate}
                    onChange={setFollowUpDate}
                    fromYear={new Date().getFullYear()}
                    className="w-44"
                  />
                  <div className="flex gap-1">
                    {[7, 14, 28].map((n) => (
                      <Button key={n} type="button" size="sm" variant="secondary" onClick={() => setFollowUpDate(inDays(n))}>
                        {n === 7 ? "1 week" : n === 14 ? "2 weeks" : "4 weeks"}
                      </Button>
                    ))}
                  </div>
                </div>
                {followUpProblem && <p className="text-xs text-destructive">{followUpProblem}</p>}
              </div>
            )}
          </div>

          {thingsToFinish.length > 0 && (
            <InlineNotice tone="warning" title="Things to finish first">
              <ul className="list-disc pl-4">
                {thingsToFinish.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-1">Choose &ldquo;Wait for results&rdquo; to keep the visit open, or finish anyway and say why.</p>
            </InlineNotice>
          )}
          {sendsToPharmacy && thingsToFinish.length === 0 && (
            <InlineNotice tone="info">
              {medicinesToCollect.length > 0 ? `${medicinesToCollect.join(", ")} still to be collected. ` : ""}
              {name} will go to the pharmacy, and the visit finishes there once the medicines are given.
            </InlineNotice>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {thingsToFinish.length > 0 ? (
              <Button type="button" variant="outline" disabled={busy || Boolean(followUpProblem)} onClick={() => setForceOpen(true)}>
                Finish anyway
              </Button>
            ) : (
              <Button type="button" disabled={busy || Boolean(followUpProblem)} onClick={() => finishMut.mutate({ force: false })}>
                {finishMut.isPending ? "Finishing…" : sendsToPharmacy ? "Send to pharmacy" : "Finish visit"}
              </Button>
            )}
          </div>
        </div>
      )}

      {step === "wait" && (
        <div className="space-y-3">
          {openLabs.length === 0 ? (
            <InlineNotice tone="info">No tests are waiting for results. Order a test first, or choose another step.</InlineNotice>
          ) : (
            <p className="text-sm text-muted-foreground">
              {name} goes back to wait. You&apos;ll see them under Waiting for results when{" "}
              {openLabs.length === 1 ? `the ${openLabs[0].serviceName} result is` : "the results are"} ready.
            </p>
          )}
          <div className="flex justify-end">
            <Button type="button" disabled={busy || openLabs.length === 0} onClick={() => waitMut.mutate()}>
              {waitMut.isPending ? "Saving…" : "Wait for results"}
            </Button>
          </div>
        </div>
      )}

      {step === "refer" && (
        <div className="rounded-lg border border-border p-3">
          <FolderReferrals visit={visit} />
        </div>
      )}

      {step === "admit" && (
        <div className="rounded-lg border border-border p-3">
          <FolderAdmissions patientUuid={encounter.patientId} visit={visit} />
        </div>
      )}

      <ConfirmDialog
        open={forceOpen}
        onOpenChange={(o) => {
          setForceOpen(o);
          if (!o) setForceReason("");
        }}
        title={`Finish ${name}'s visit anyway?`}
        description="Some work isn't finished yet. Say why you're finishing now — it's added to the Plan in your notes."
        confirmLabel="Finish visit"
        pending={finishMut.isPending}
        footerExtra={
          <Textarea
            rows={3}
            value={forceReason}
            onChange={(e) => setForceReason(e.target.value)}
            placeholder="e.g. Patient chose to leave; will return for the result"
          />
        }
        onConfirm={async () => {
          if (!forceReason.trim()) {
            toast.error("Say why you're finishing before the work is done.");
            throw new Error("missing reason");
          }
          // TODO(backend): complete(force) has no reason field — see backend-gaps.md#DOC-13-force-reason. Kept in the note's Plan meanwhile.
          await finishMut.mutateAsync({ force: true, reason: forceReason.trim() });
        }}
      />
    </section>
  );
}
