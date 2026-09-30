"use client";

import { AlertTriangle, Check, Cloud, HardDrive, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatClinicalDateTime, formatTime } from "@/lib/dates";
import { cleanPersonName } from "@/lib/display-name";
import type { ConsultationDraft } from "@/hooks/use-consultation-draft";
import type { ConsultationNoteDto } from "@/types/clinical.types";

export type RecordSaveState = "not-saved" | "saving" | "saved" | "changed" | "error";

interface NotesCardProps {
  draft: ConsultationDraft;
  onChange: (patch: Partial<ConsultationDraft>) => void;
  onBlur: () => void;
  saveState: RecordSaveState;
  savedAt: string | null;
  /** Notes already on this visit, other than the one being edited. */
  otherNotes: ConsultationNoteDto[];
  onEditNote: (note: ConsultationNoteDto) => void;
  editDisabledReason?: string;
  /** Finished visit: show saved notes only, no inputs. */
  readOnly?: boolean;
}

const FIELDS: Array<{
  key: "history" | "examination" | "assessment" | "plan";
  label: string;
  placeholder: string;
  rows: number;
}> = [
  {
    key: "history",
    label: "What the patient says",
    placeholder:
      "History of the complaint, how long, what makes it better or worse…",
    rows: 4,
  },
  {
    key: "examination",
    label: "What I found",
    placeholder: "Examination findings…",
    rows: 3,
  },
  {
    key: "assessment",
    label: "My assessment",
    placeholder: "What you think is going on…",
    rows: 2,
  },
  {
    key: "plan",
    label: "Plan",
    placeholder: "Tests, treatment, advice, follow-up…",
    rows: 2,
  },
];

/** DOC-03 — structured consultation notes. Draft lives on this computer until saved with a diagnosis. */
export function NotesCard({
  draft,
  onChange,
  onBlur,
  saveState,
  savedAt,
  otherNotes,
  onEditNote,
  editDisabledReason,
  readOnly = false,
}: NotesCardProps) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Notes</h2>
          <p className="text-xs text-muted-foreground">
            {readOnly
              ? "What was written during this visit."
              : draft.editingNoteId
                ? "Editing your note on this visit."
                : "Your notes for this visit."}
          </p>
        </div>
        {!readOnly && (
          <RecordStatus
            state={saveState}
            savedAt={savedAt}
            hasDraft={Boolean(draft.updatedAt)}
          />
        )}
      </div>

      {!readOnly && (
        <div className="grid gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label
                htmlFor={`note-${f.key}`}
                className="text-sm font-medium text-foreground"
              >
                {f.label}
              </label>
              <Textarea
                id={`note-${f.key}`}
                rows={f.rows}
                value={draft[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => onChange({ [f.key]: e.target.value })}
                onBlur={onBlur}
              />
            </div>
          ))}
        </div>
      )}

      {otherNotes.length > 0 && (
        <div
          className={
            readOnly ? "space-y-2" : "space-y-2 border-t border-border pt-4"
          }
        >
          {!readOnly && (
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Earlier notes on this visit
            </p>
          )}
          <ul className="space-y-3">
            {otherNotes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-border bg-surface-subtle p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {cleanPersonName(n.authoredByName) || "A clinician"}
                    {n.authoredAt
                      ? ` · ${formatClinicalDateTime(n.authoredAt)}`
                      : ""}
                  </p>
                  {n.editableToday && !readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(editDisabledReason)}
                      title={editDisabledReason}
                      onClick={() => onEditNote(n)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </div>
                <NoteText
                  label="What the patient says"
                  value={n.historyOfPresentComplaint || n.chiefComplaint}
                />
                <NoteText label="What I found" value={n.examinationFindings} />
                <NoteText label="Assessment" value={n.assessment} />
                <NoteText label="Plan" value={n.plan} />
                {n.principalClassification && (
                  <NoteText
                    label="Main diagnosis"
                    value={n.principalClassification.name}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function NoteText({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <p className="mt-1.5 text-sm text-foreground">
      <span className="text-xs text-muted-foreground">{label}: </span>
      {value}
    </p>
  );
}

function RecordStatus({
  state,
  savedAt,
  hasDraft,
}: {
  state: RecordSaveState;
  savedAt: string | null;
  hasDraft: boolean;
}) {
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive" aria-live="polite">
        <AlertTriangle className="h-3.5 w-3.5" /> Couldn&apos;t save to the record. Trying again shortly — your draft is safe on this computer.
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving to the record…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-success"
        aria-live="polite"
      >
        <Check className="h-3.5 w-3.5" /> Saved to the record
        {savedAt ? ` at ${formatTime(savedAt)}` : ""}
      </span>
    );
  }
  if (state === "changed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <Cloud className="h-3.5 w-3.5" /> Changes not saved to the record yet
      </span>
    );
  }
  if (!hasDraft) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <HardDrive className="h-3.5 w-3.5" /> Draft kept on this computer
    </span>
  );
}
