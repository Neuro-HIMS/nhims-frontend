"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pencil, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { CardSkeleton } from "@/components/common/skeletons";
import { ConsultationNoteDialog } from "@/components/clinical/consultation/consultation-note-dialog";
import {
  FolderRecordExpandableRow,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
import { Button } from "@/components/ui/button";
import { cleanPersonName } from "@/lib/display-name";
import { queryKeys } from "@/lib/query-keys";
import { roleLabel } from "@/lib/status-labels";
import { clinicalService } from "@/services/clinical.service";
import type { Visit } from "@/lib/clinical-types";
import type {
  ClassificationSummaryDto,
  ConsultationNoteAdditionalDiagnosisDto,
  ConsultationNoteDto,
} from "@/types/clinical.types";

function summarizeClassification(c: ClassificationSummaryDto | null | undefined): string | null {
  if (!c) return null;
  const icd = c.icd11Code ? ` (${c.icd11Code})` : "";
  const desc = c.description?.trim();
  if (desc && desc.toLowerCase() !== c.name.toLowerCase()) return `${c.name} — ${desc}${icd}`;
  return `${c.name}${icd}`;
}

interface FolderConsultationsProps {
  patientId: string;
  visit: Visit | null;
  authoredBy: string;
}

/** Patient folder → Notes: the visit's consultation notes, written and edited in a dialog. */
export function FolderConsultations({ visit }: FolderConsultationsProps) {
  const [dialog, setDialog] = useState<{ open: boolean; note: ConsultationNoteDto | null }>({ open: false, note: null });

  const notesQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.consultations(visit.id) : ["clinical", "consultations", "idle"],
    queryFn: () => clinicalService.listConsultationNotes(visit!.id),
    enabled: Boolean(visit),
  });

  const sortedNotes = useMemo(
    () => [...(notesQuery.data ?? [])].sort((a, b) => (b.authoredAt ?? "").localeCompare(a.authoredAt ?? "")),
    [notesQuery.data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Consultation notes</p>
          <p className="text-xs text-muted-foreground">
            {sortedNotes.length} note{sortedNotes.length === 1 ? "" : "s"} on this visit
          </p>
        </div>
        <Button size="sm" disabled={!visit} onClick={() => setDialog({ open: true, note: null })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add note
        </Button>
      </div>

      {!visit ? (
        <EmptyState illustration="choose-patient" title="No visit selected" description="Open the patient from a visit to see or add notes." />
      ) : notesQuery.isPending ? (
        <CardSkeleton />
      ) : notesQuery.isError ? (
        <ErrorState error={notesQuery.error} onRetry={() => void notesQuery.refetch()} />
      ) : sortedNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card">
          <EmptyState
            illustration="empty-list"
            title="No notes yet"
            description="Notes written for this visit will appear here."
            action={{ label: "Add note", onClick: () => setDialog({ open: true, note: null }) }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((n, idx) => {
            const title =
              n.principalClassification?.name ||
              n.provisionalClassification?.name ||
              (n.chiefComplaint?.trim() ? n.chiefComplaint.trim().slice(0, 120) : "Consultation note");
            return (
              <FolderRecordExpandableRow
                key={n.id}
                railIndex={sortedNotes.length - idx}
                icon={FileText}
                eyebrow={n.authoredRole ? `${roleLabel(n.authoredRole)} · Consultation` : "Consultation"}
                title={<span className="font-normal">{title}</span>}
                preview={<span>{cleanPersonName(n.authoredByName) || "Author not recorded"}</span>}
                footerTime={n.authoredAt}
                headerActions={
                  n.editableToday ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ open: true, note: n })}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null
                }
              >
                <div className="space-y-4">
                  <FolderRecordField label="Main complaint" value={n.chiefComplaint?.trim() || null} />
                  <FolderRecordField label="What the patient says" value={n.historyOfPresentComplaint?.trim() || null} />
                  <FolderRecordField label="What was found" value={n.examinationFindings?.trim() || null} />
                  <FolderRecordField label="Assessment" value={n.assessment?.trim() || null} />
                  <FolderRecordField label="Plan" value={n.plan?.trim() || null} />
                  <FolderRecordField
                    label="Provisional diagnosis"
                    value={
                      [summarizeClassification(n.provisionalClassification), n.provisionalDiagnosis?.trim()]
                        .filter(Boolean)
                        .join(" — ") || null
                    }
                  />
                  <FolderRecordField
                    label={`Principal diagnosis${n.principalDiagnosisNewCase ? " (new case)" : n.principalDiagnosisOldCase ? " (old case)" : ""}`}
                    value={summarizeClassification(n.principalClassification)}
                  />
                  {n.additionalDiagnoses && n.additionalDiagnoses.length > 0 ? (
                    <FolderRecordField
                      label="Additional diagnoses"
                      value={
                        <ul className="list-inside list-disc space-y-1">
                          {n.additionalDiagnoses.map((a: ConsultationNoteAdditionalDiagnosisDto) => (
                            <li key={a.id}>{formatAdditionalLine(a)}</li>
                          ))}
                        </ul>
                      }
                    />
                  ) : null}
                </div>
              </FolderRecordExpandableRow>
            );
          })}
        </div>
      )}

      {visit && (
        <ConsultationNoteDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          encounterId={visit.id}
          visitNumber={visit.visitNo}
          note={dialog.note}
          defaultComplaint={visit.reason}
        />
      )}
    </div>
  );
}

function formatAdditionalLine(a: ConsultationNoteAdditionalDiagnosisDto): string {
  const kind = a.newCase ? "new case" : a.oldCase ? "old case" : "";
  const name = a.classificationName ?? a.freeText?.trim() ?? "";
  const icd = a.icd11Code ? ` (${a.icd11Code})` : "";
  return `${name ? name + icd : "—"}${kind ? ` · ${kind}` : ""}`;
}
