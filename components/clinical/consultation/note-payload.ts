import {
  EMPTY_DRAFT,
  missingForRecord,
  newRowKey,
  type ConsultationDraft,
} from "@/hooks/use-consultation-draft";
import type { ConsultationNoteDto, CreateConsultationNotePayload } from "@/types/clinical.types";

/** Consultation note ⇄ draft mapping, shared by the consultation page and the patient-folder note dialog. */
export function buildNotePayload(draft: ConsultationDraft, chiefComplaint: string, role: string | undefined): CreateConsultationNotePayload | null {
  if (missingForRecord(draft).length > 0 || !draft.provisional || !draft.principal || !draft.principalCase) return null;
  const additional = draft.additional.filter((a) => a.condition || a.freeText.trim());
  return {
    chiefComplaint,
    historyOfPresentComplaint: draft.history.trim(),
    examinationFindings: draft.examination.trim(),
    assessment: draft.assessment.trim(),
    plan: draft.plan.trim(),
    provisionalDiagnosis: draft.provisionalText.trim(),
    provisionalClassificationId: draft.provisional.conditionId,
    principalClassificationId: draft.principal.conditionId,
    principalDiagnosisNewCase: draft.principalCase === "new",
    principalDiagnosisOldCase: draft.principalCase === "old",
    additionalDiagnoses: additional.length
      ? additional.map((a) => ({
          classificationId: a.condition?.conditionId ?? null,
          freeText: a.condition ? undefined : a.freeText.trim(),
          newCase: a.caseKind === "new",
          oldCase: a.caseKind === "old",
        }))
      : undefined,
    authoredRole: role,
  };
}

export function noteToDraft(note: ConsultationNoteDto, previous: ConsultationDraft = EMPTY_DRAFT): ConsultationDraft {
  const pick = (c: { id: string; name: string; icd11Code: string | null } | null) =>
    c ? { conditionId: c.id, name: c.name, code: c.icd11Code ?? "" } : null;
  return {
    ...EMPTY_DRAFT,
    history: note.historyOfPresentComplaint ?? "",
    examination: note.examinationFindings ?? "",
    assessment: note.assessment ?? "",
    plan: note.plan ?? "",
    provisional: pick(note.provisionalClassification),
    provisionalText: note.provisionalDiagnosis ?? "",
    principal: pick(note.principalClassification),
    principalCase: note.principalDiagnosisNewCase ? "new" : note.principalDiagnosisOldCase ? "old" : null,
    // Free-text-only additional diagnoses are kept too, so saving the edit never drops them.
    additional: (note.additionalDiagnoses ?? []).map((a) => ({
      key: newRowKey(),
      condition: a.classificationId ? { conditionId: a.classificationId, name: a.classificationName ?? a.freeText, code: a.icd11Code ?? "" } : null,
      freeText: a.classificationId ? "" : a.freeText,
      caseKind: a.newCase ? "new" : a.oldCase ? "old" : null,
    })),
    flagged: previous.flagged,
    editingNoteId: note.id,
    updatedAt: new Date().toISOString(),
  };
}

