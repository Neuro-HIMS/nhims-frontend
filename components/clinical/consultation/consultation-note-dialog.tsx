"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { DiagnosisCard } from "@/components/clinical/consultation/diagnosis-card";
import { buildNotePayload, noteToDraft } from "@/components/clinical/consultation/note-payload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_DRAFT, type ConsultationDraft } from "@/hooks/use-consultation-draft";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { ConsultationNoteDto } from "@/types/clinical.types";

const NOTE_FIELDS: Array<{ key: "history" | "examination" | "assessment" | "plan"; label: string; placeholder: string; rows: number }> = [
  { key: "history", label: "What the patient says", placeholder: "History of the complaint, how long, what makes it better or worse…", rows: 3 },
  { key: "examination", label: "What was found", placeholder: "Examination findings…", rows: 3 },
  { key: "assessment", label: "Assessment", placeholder: "What you think is going on…", rows: 2 },
  { key: "plan", label: "Plan", placeholder: "Tests, treatment, advice, follow-up…", rows: 2 },
];

interface ConsultationNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  visitNumber?: string;
  /** Edit this note; omit to write a new one. */
  note?: ConsultationNoteDto | null;
  /** Pre-fills "Main complaint" for a new note (e.g. the triage complaint). */
  defaultComplaint?: string;
}

/**
 * Write or edit a consultation note from the patient folder — the same fields as the doctor's
 * consultation page: notes, provisional diagnosis, principal diagnosis with new/old case, and
 * additional diagnoses with new/old case (DHIMS2).
 */
export function ConsultationNoteDialog(props: ConsultationNoteDialogProps) {
  // Mount the form only while open, so each open starts from the right note (no reset effects).
  if (!props.open) return null;
  return <NoteDialogBody {...props} />;
}

function NoteDialogBody({ open, onOpenChange, encounterId, visitNumber, note, defaultComplaint = "" }: ConsultationNoteDialogProps) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [draft, setDraft] = useState<ConsultationDraft>(() => (note ? noteToDraft(note) : EMPTY_DRAFT));
  const [complaint, setComplaint] = useState(note?.chiefComplaint ?? defaultComplaint);

  const patch = (p: Partial<ConsultationDraft>) => setDraft((d) => ({ ...d, ...p }));
  const payload = buildNotePayload(draft, complaint.trim(), role);

  const saveMut = useMutation({
    mutationFn: () =>
      note
        ? clinicalService.updateConsultationNote(encounterId, note.id, payload!)
        : clinicalService.createConsultationNote(encounterId, payload!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(note ? "Note updated." : "Note saved.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={note ? "Edit consultation note" : "Add consultation note"}
      description={visitNumber ? `For visit ${visitNumber}.` : undefined}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!payload || saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {note ? "Save changes" : "Save note"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="Notes">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="dlg-note-complaint" className="text-sm font-medium text-foreground">
            Main complaint
          </label>
          <Textarea id="dlg-note-complaint" rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Fever for 3 days" />
        </div>
        {NOTE_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label htmlFor={`dlg-note-${f.key}`} className="text-sm font-medium text-foreground">
              {f.label}
            </label>
            <Textarea
              id={`dlg-note-${f.key}`}
              rows={f.rows}
              value={draft[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => patch({ [f.key]: e.target.value })}
            />
          </div>
        ))}
      </FormDialogSection>

      <FormDialogSection title="Diagnosis" description="Recorded for this visit and used for the monthly DHIMS2 report." columns={1}>
        <DiagnosisCard bare draft={draft} onChange={patch} />
      </FormDialogSection>
    </FormDialog>
  );
}
