"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { NoAccessNotice } from "@/components/common/no-access-notice";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { ConsultationSummary } from "@/components/clinical/consultation/consultation-summary";
import { DiagnosisCard } from "@/components/clinical/consultation/diagnosis-card";
import { NextStepCard } from "@/components/clinical/consultation/next-step-card";
import { NotesCard, type RecordSaveState } from "@/components/clinical/consultation/notes-card";
import { CriticalResults } from "@/components/clinical/lab/critical-results";
import { LabOrdersCard } from "@/components/clinical/lab/lab-orders-card";
import { ImagingOrdersCard } from "@/components/clinical/imaging/imaging-orders-card";
import { MedicinesCard } from "@/components/clinical/pharmacy/medicines-card";
import { TreatmentsCard } from "@/components/clinical/folder/folder-treatments";
import { Button } from "@/components/ui/button";
import { useCallIn } from "@/hooks/use-call-in";
import {
  draftHasContent,
  EMPTY_DRAFT,
  missingForRecord,
  useConsultationDraft,
  type ConsultationDraft,
} from "@/hooks/use-consultation-draft";
import { buildNotePayload as buildPayload, noteToDraft } from "@/components/clinical/consultation/note-payload";
import { getFriendlyError } from "@/lib/api-errors";
import { cleanPersonName, displayName, naturalName } from "@/lib/display-name";
import { isNotifiableDisease } from "@/lib/notifiable-diseases";
import { canPlaceOrders, canViewFullFolder } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { encounterStatusLabel } from "@/lib/status-labels";
import { ageInYears } from "@/lib/vitals-ranges";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import { surveillanceService } from "@/services/surveillance.service";
import { useAuthStore } from "@/store/auth.store";
import type { ConsultationNoteDto, CreateConsultationNotePayload, FolderViewDto } from "@/types/clinical.types";

const AUTOSAVE_MS = 10_000;
const FINISHED = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

/** DOC-02 — the one consultation page: `/opd?view=consult&encounterId=…`. */
export function ConsultationView() {
  const router = useRouter();
  const encounterId = useSearchParams().get("encounterId");
  const role = useAuthStore((s) => s.user?.role);

  const folderQuery = useQuery({
    queryKey: encounterId ? queryKeys.clinical.folder(encounterId) : ["clinical", "folder", "idle"],
    queryFn: () => clinicalService.getFolder(encounterId!),
    enabled: Boolean(encounterId && canViewFullFolder(role)),
  });

  const back = (
    <Button variant="ghost" size="sm" onClick={() => router.push("/opd?view=queue")}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to patients waiting
    </Button>
  );

  if (role && !canViewFullFolder(role)) {
    return (
      <div className="space-y-4">
        {back}
        <NoAccessNotice />
      </div>
    );
  }

  if (!encounterId) {
    return (
      <EmptyState
        illustration="choose-patient"
        title="No patient open"
        description="Call in a patient from Patients waiting to start a consultation."
        action={{ label: "Patients waiting", href: "/opd?view=queue" }}
      />
    );
  }

  if (folderQuery.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <BannerSkeleton />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // A failed background refresh keeps the page (and the doctor's typing); only a failed first load shows the error.
  if (folderQuery.isError && !folderQuery.data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={folderQuery.error} onRetry={() => void folderQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      <ConsultationWorkspace key={encounterId} folder={folderQuery.data!} />
    </div>
  );
}

function ConsultationWorkspace({ folder }: { folder: FolderViewDto }) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const encounter = folder.encounter;
  const encounterId = encounter.id;
  const patientId = encounter.patientId;
  const isPrescriber = canPlaceOrders(user?.role);
  const finished = FINISHED.has(encounter.status);
  const canWrite = isPrescriber && !finished;

  const { draft, update, replace, clear } = useConsultationDraft(encounterId);

  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => patientsService.getById(patientId),
  });
  const age = patientQuery.data
    ? ageInYears(patientQuery.data.birthDate, patientQuery.data.statedAgeValue, patientQuery.data.statedAgeUnit)
    : null;
  const patientName = patientQuery.data
    ? `${patientQuery.data.firstName} ${patientQuery.data.lastName}`.trim()
    : naturalName(encounter.patientName);

  const historyQuery = useQuery({
    queryKey: queryKeys.clinical.byPatient(patientId),
    queryFn: () => clinicalService.byPatient(patientId),
  });
  const earlierVisits = useMemo(
    () =>
      (historyQuery.data ?? [])
        // Only visits that actually happened — not cancelled ones, and not booked follow-ups still to come.
        .filter((e) => e.id !== encounterId && !["CANCELLED", "NO_SHOW", "SCHEDULED"].includes(e.status) && Boolean(e.checkedInAt))
        .sort((a, b) => (b.checkedInAt ?? b.createdAt ?? "").localeCompare(a.checkedInAt ?? a.createdAt ?? "")),
    [historyQuery.data, encounterId],
  );

  const notesQuery = useQuery({
    queryKey: queryKeys.clinical.consultations(encounterId),
    queryFn: () => clinicalService.listConsultationNotes(encounterId),
    initialData: folder.consultationNotes,
  });
  const otherNotes = (notesQuery.data ?? [])
    .filter((n) => n.id !== draft.editingNoteId)
    .sort((a, b) => (b.authoredAt ?? "").localeCompare(a.authoredAt ?? ""));

  // A draft left "editing" a note that can no longer be edited (another day) would make every save fail:
  // keep the text, but save it as a new note instead.
  // Checked once, against a fresh list (not the folder snapshot, which never contains a note just created here).
  const staleChecked = useRef(false);
  useEffect(() => {
    if (staleChecked.current || !notesQuery.isFetchedAfterMount || !notesQuery.data) return;
    staleChecked.current = true;
    if (!draft.editingNoteId) return;
    const note = notesQuery.data.find((n) => n.id === draft.editingNoteId);
    if (!note || !note.editableToday) replace({ ...draft, editingNoteId: null, savedKey: null });
  }, [draft, notesQuery.isFetchedAfterMount, notesQuery.data, replace]);

  const triageComplaint =
    [...folder.triage].sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))[0]?.chiefComplaint ?? encounter.reason ?? "";

  const payload = buildPayload(draft, triageComplaint, user?.role);
  const payloadKey = payload ? JSON.stringify(payload) : null;
  const dirty = payloadKey !== null && payloadKey !== draft.savedKey;

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const saveState: RecordSaveState = saving
    ? "saving"
    : saveFailed && dirty
      ? "error"
      : payloadKey !== null && payloadKey === draft.savedKey
        ? "saved"
        : draft.editingNoteId
          ? "changed"
          : "not-saved";

  // What is already in the record, read at the moment each save runs. Kept in refs (not only in the
  // draft state) so a save that starts right after another one sees the new note id at once and
  // updates it — instead of creating a second note.
  const record = useRef({ noteId: draft.editingNoteId, savedKey: draft.savedKey, flagged: draft.flagged });
  useEffect(() => {
    record.current = { noteId: draft.editingNoteId, savedKey: draft.savedKey, flagged: draft.flagged };
  }, [draft.editingNoteId, draft.savedKey, draft.flagged]);

  const latest = useRef({ payload, payloadKey, draft });
  useEffect(() => {
    latest.current = { payload, payloadKey, draft };
  });

  const doSave = useCallback(
    async (p: CreateConsultationNotePayload, key: string, d: ConsultationDraft): Promise<boolean> => {
      if (key === record.current.savedKey) return true;
      setSaving(true);
      try {
        const noteId = record.current.noteId;
        const saved = noteId
          ? await clinicalService.updateConsultationNote(encounterId, noteId, p)
          : await clinicalService.createConsultationNote(encounterId, p);
        record.current = { ...record.current, noteId: saved.id, savedKey: key };
        update({ editingNoteId: saved.id, savedKey: key });
        setSavedAt(new Date().toISOString());
        setSaveFailed(false);
        qc.invalidateQueries({ queryKey: queryKeys.clinical.consultations(encounterId) });
        qc.invalidateQueries({ queryKey: queryKeys.clinical.folder(encounterId) });

        // Surveillance flags: once per diagnosis, remembered in the draft so reloads don't resend.
        const toFlag = (surveillanceService.available() ? [d.principal, ...d.additional.map((a) => a.condition)] : []).filter(
          (c): c is NonNullable<typeof c> =>
            Boolean(c) &&
            d.surveillance.includes(c!.conditionId) &&
            !record.current.flagged.includes(c!.conditionId) &&
            isNotifiableDisease(c!.name),
        );
        for (const c of toFlag) {
          try {
            await surveillanceService.flag({ encounterId, patientId, conditionId: c.conditionId, conditionName: c.name });
            record.current = { ...record.current, flagged: [...record.current.flagged, c.conditionId] };
            update((prev) => ({ flagged: [...new Set([...prev.flagged, c.conditionId])] }));
            toast.success(`${c.name} flagged for disease surveillance.`);
          } catch (e) {
            toast.error(`Couldn't flag ${c.name} for disease surveillance. ${getFriendlyError(e).message}`);
          }
        }
        return true;
      } catch (e) {
        setSaveFailed(true);
        toast.error(getFriendlyError(e).message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [encounterId, patientId, update, qc],
  );

  // Saves run strictly one after another, each using the newest draft when its turn comes.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const busyRef = useRef(false);
  const enqueue = useCallback((job: () => Promise<boolean>): Promise<boolean> => {
    const run = queue.current.then(async () => {
      busyRef.current = true;
      try {
        return await job();
      } finally {
        busyRef.current = false;
      }
    });
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Saves the latest draft if it has unsaved changes. Resolves false when it can't be saved (yet). */
  const saveToRecord = useCallback(
    () =>
      enqueue(async () => {
        const { payload: p, payloadKey: key, draft: d } = latest.current;
        if (!p || !key) return false;
        return doSave(p, key, d);
      }),
    [enqueue, doSave],
  );

  const isDirtyNow = () => latest.current.payloadKey !== null && latest.current.payloadKey !== record.current.savedKey;

  // Autosave every 10 seconds while there are unsaved, saveable changes (typing doesn't postpone it).
  useEffect(() => {
    if (!canWrite) return;
    const t = setInterval(() => {
      if (!busyRef.current && isDirtyNow()) void saveToRecord();
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [canWrite, saveToRecord]);

  const onBlur = () => {
    if (canWrite && !busyRef.current && isDirtyNow()) void saveToRecord();
  };

  /** Saves the notes before the visit moves on. `extraPlan` (e.g. why a visit was finished early) is added to the Plan first. */
  async function ensureNotesSaved(extraPlan?: string): Promise<boolean> {
    if (extraPlan) {
      const current = latest.current.draft;
      const d = { ...current, plan: [current.plan.trim(), extraPlan].filter(Boolean).join("\n") };
      const p = buildPayload(d, triageComplaint, user?.role);
      if (p) {
        update({ plan: d.plan });
        return enqueue(() => doSave(p, JSON.stringify(p), d));
      }
    }
    const d = latest.current.draft;
    if (latest.current.payload) return saveToRecord();
    const hasSavedNote = (notesQuery.data ?? []).some((n) => n.principalClassification);
    if (hasSavedNote && !draftHasContent(d)) return true;
    toast.error(`Before the visit can finish, add ${missingForRecord(d).join(", ") || "your diagnoses"}.`);
    document.getElementById("consult-diagnosis")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  const callIn = useCallIn(() => toast.success(`${patientName} is now with you.`));
  const me = user ? { userId: user.userId, name: displayName(user) } : null;
  const withAnotherDoctor =
    encounter.status === "IN_CONSULTATION" && Boolean(encounter.assignedClinicianId) && encounter.assignedClinicianId !== user?.userId;

  const editDisabledReason =
    dirty || (draftHasContent(draft) && !draft.editingNoteId) ? "Save or finish your current notes first." : undefined;

  return (
    <div className="space-y-4">
      <PatientBanner patientId={patientId} encounterId={encounterId} />
      <CriticalResults encounterId={encounterId} />

      {finished ? (
        <InlineNotice tone="info" title="This visit has finished.">
          You can read what was recorded. To add anything now, start a new visit from Find a patient.
        </InlineNotice>
      ) : !isPrescriber ? (
        <InlineNotice tone="info" title="Only doctors can write consultation notes.">
          You can read what has been recorded for this visit.
        </InlineNotice>
      ) : withAnotherDoctor ? (
        <InlineNotice tone="warning" title={`${patientName} is with ${cleanPersonName(encounter.clinicianName) || "another doctor"}.`}>
          Only add notes if you are taking over their care.
          <div className="mt-2">
            <Button size="sm" variant="outline" disabled={callIn.isPending} onClick={() => callIn.mutate(encounter)}>
              Take over this patient
            </Button>
          </div>
        </InlineNotice>
      ) : encounter.status !== "IN_CONSULTATION" ? (
        <InlineNotice tone="pending" title={`${patientName} isn't with you yet.`}>
          Stage now: {encounterStatusLabel(encounter.status).toLowerCase()}. Call them in so the nurses and other doctors know.
          <div className="mt-2">
            <Button size="sm" disabled={callIn.isPending} onClick={() => callIn.mutate(encounter)}>
              {callIn.isPending ? "Calling in…" : "Call in"}
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-4">
          <ConsultationSummary folder={folder} earlierVisits={earlierVisits} ageYears={age} patientId={patientId} />
        </div>

        <div className="space-y-4">
          {!canWrite ? (
            <NotesReadOnly notes={otherNotes} />
          ) : (
            <>
              <NotesCard
                draft={draft}
                onChange={(p) => update(p)}
                onBlur={onBlur}
                saveState={saveState}
                savedAt={savedAt}
                otherNotes={otherNotes}
                editDisabledReason={editDisabledReason}
                onEditNote={(n) => {
                  const next = noteToDraft(n, draft);
                  const key = buildPayload(next, triageComplaint, user?.role);
                  replace({ ...next, savedKey: key ? JSON.stringify(key) : null });
                }}
              />

              <div id="consult-diagnosis" onBlur={onBlur}>
                <DiagnosisCard
                  draft={draft}
                  onChange={(p) => update(p)}
                  footer={
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                      {draftHasContent(draft) && !draft.editingNoteId && (
                        <Button type="button" variant="secondary" disabled={saving} onClick={() => setClearOpen(true)}>
                          Clear draft
                        </Button>
                      )}
                      <Button type="button" variant="outline" disabled={!payload || !dirty || saving} onClick={() => void saveToRecord()}>
                        <Save className="mr-1.5 h-4 w-4" />
                        {saving ? "Saving…" : "Save notes and diagnosis"}
                      </Button>
                    </div>
                  }
                />
              </div>

              <OrdersCard title="Tests" description="Lab tests and scans for this visit.">
                <LabOrdersCard
                  bare
                  encounterId={encounterId}
                  patientName={patientName}
                  payerType={encounter.payerType}
                  canOrder={isPrescriber}
                />
                <div className="border-t border-border pt-3">
                  <ImagingOrdersCard
                    encounterId={encounterId}
                    patientName={patientName}
                    payerType={encounter.payerType}
                    canOrder={isPrescriber}
                  />
                </div>
              </OrdersCard>

              <OrdersCard title="Medicines" description="Prescriptions for this visit.">
                <MedicinesCard
                  bare
                  encounterId={encounterId}
                  patientId={patientId}
                  patientName={patientName}
                  payerType={encounter.payerType}
                  canPrescribe={canWrite}
                />
              </OrdersCard>

              <OrdersCard title="Treatments" description="Injections, drips, dressings and other care given here.">
                <TreatmentsCard bare onlyThisVisit readOnly={!canWrite} patientUuid={patientId} encounterId={encounterId} />
              </OrdersCard>

              <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title="Clear your draft notes?"
                description="The notes and diagnoses you've typed for this visit will be removed. They haven't been saved to the record."
                confirmLabel="Clear draft"
                cancelLabel="Keep my notes"
                destructive
                onConfirm={() => {
                  clear();
                  setClearOpen(false);
                }}
              />

              <NextStepCard
                folder={folder}
                patientName={patientName}
                me={me}
                mainDiagnosis={draft.principal?.name ?? null}
                ensureNotesSaved={ensureNotesSaved}
                onLeftDoctor={clear}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function NotesReadOnly({ notes }: { notes: ConsultationNoteDto[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState illustration="empty-list" title="No notes on this visit" description="Nothing has been written for this visit yet." />
      </div>
    );
  }
  return (
    <NotesCard
      draft={EMPTY_DRAFT}
      onChange={() => undefined}
      onBlur={() => undefined}
      saveState="not-saved"
      savedAt={null}
      otherNotes={notes}
      onEditNote={() => undefined}
      readOnly
    />
  );
}
