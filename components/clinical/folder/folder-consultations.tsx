"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ClassificationPicker } from "@/components/clinical/classification-picker";
import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { useAuthStore } from "@/store/auth.store";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { Visit } from "@/lib/clinical-types";
import type { ApiError } from "@/types/api.types";
import type {
  ClinicalConditionDto,
  ClassificationSummaryDto,
  ConsultationNoteAdditionalDiagnosisDto,
  ConsultationNoteDto,
  CreateConsultationNotePayload,
} from "@/types/clinical.types";

type PrincipalCase = "" | "new" | "old";

type AdditionalRow = {
  key: string;
  classification: ClinicalConditionDto | null;
  freeText: string;
  caseKind: PrincipalCase;
};

interface ConsultFormState {
  chiefComplaint: string;
  historyOfPresentComplaint: string;
  examinationFindings: string;
  assessment: string;
  plan: string;
  provisionalDiagnosis: string;
  provisionalClassification: ClinicalConditionDto | null;
  principalClassification: ClinicalConditionDto | null;
  principalCase: PrincipalCase;
  additional: AdditionalRow[];
}

function emptyAdditionalRow(): AdditionalRow {
  return {
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    classification: null,
    freeText: "",
    caseKind: "",
  };
}

const EMPTY_FORM: ConsultFormState = {
  chiefComplaint: "",
  historyOfPresentComplaint: "",
  examinationFindings: "",
  assessment: "",
  plan: "",
  provisionalDiagnosis: "",
  provisionalClassification: null,
  principalClassification: null,
  principalCase: "",
  additional: [],
};

function summarizeClassification(c: ClassificationSummaryDto | null | undefined): string | null {
  if (!c) return null;
  const icd = c.icd11Code ? ` (${c.icd11Code})` : "";
  const desc = c.description?.trim();
  if (desc) return `${c.name} — ${desc}${icd}`;
  return `${c.name}${icd}`;
}

function isSameDayEditable(note: ConsultationNoteDto): boolean {
  if (typeof note.editableToday === "boolean") {
    return note.editableToday;
  }
  if (!note.authoredAt) {
    return false;
  }
  const d = new Date(note.authoredAt);
  if (Number.isNaN(d.getTime())) {
    return false;
  }
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface FolderConsultationsProps {
  patientId: string;
  visit: Visit | null;
  authoredBy: string;
}

export function FolderConsultations({ visit, patientId: _patientId, authoredBy: _authoredBy }: FolderConsultationsProps) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);

  const notesQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.consultations(visit.id) : ["clinical", "consultations", "idle"],
    queryFn: () => clinicalService.listConsultationNotes(visit!.id),
    enabled: Boolean(visit),
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateConsultationNotePayload) =>
      clinicalService.createConsultationNote(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Consultation note saved");
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not save note");
    },
  });
  const updateMut = useMutation({
    mutationFn: ({
      noteId,
      payload,
    }: {
      noteId: string;
      payload: CreateConsultationNotePayload;
    }) => clinicalService.updateConsultationNote(visit!.id, noteId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Consultation note updated");
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingNoteId(null);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not update note");
    },
  });

  const [form, setForm] = useState<ConsultFormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  function updateForm<K extends keyof ConsultFormState>(key: K, value: ConsultFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!visit) {
      toast.error("Open the patient from a visit before adding a clinical note");
      return;
    }
    if (!form.chiefComplaint.trim() && !form.assessment.trim()) {
      toast.error("Add at least a chief complaint or assessment");
      return;
    }

    if (!form.provisionalClassification) {
      toast.error("Provisional classification is required");
      return;
    }
    if (!form.principalClassification) {
      toast.error("Principal classification is required");
      return;
    }
    if (!form.principalCase) {
      toast.error("Select whether the principal diagnosis is a new case or an old case");
      return;
    }

    const additionalPayload: NonNullable<CreateConsultationNotePayload["additionalDiagnoses"]> = [];
    for (const row of form.additional) {
      const hasClass = Boolean(row.classification);
      const ft = row.freeText.trim();
      if (!hasClass && !ft) continue;
      if (!row.caseKind) {
        toast.error("Each additional diagnosis must be new or old case");
        return;
      }
      additionalPayload.push({
        classificationId: row.classification?.id ?? undefined,
        freeText: ft || undefined,
        newCase: row.caseKind === "new",
        oldCase: row.caseKind === "old",
      });
    }

    const payload: CreateConsultationNotePayload = {
      chiefComplaint: form.chiefComplaint,
      historyOfPresentComplaint: form.historyOfPresentComplaint,
      examinationFindings: form.examinationFindings,
      assessment: form.assessment,
      plan: form.plan,
      provisionalDiagnosis: form.provisionalDiagnosis,
      provisionalClassificationId: form.provisionalClassification?.id ?? undefined,
      principalClassificationId: form.principalClassification?.id ?? undefined,
      principalDiagnosisNewCase: form.principalClassification ? form.principalCase === "new" : false,
      principalDiagnosisOldCase: form.principalClassification ? form.principalCase === "old" : false,
      additionalDiagnoses: additionalPayload.length ? additionalPayload : undefined,
      authoredRole: role,
    };

    if (editingNoteId) {
      updateMut.mutate({ noteId: editingNoteId, payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function beginEdit(note: ConsultationNoteDto) {
    if (!isSameDayEditable(note)) {
      toast.error("This note can no longer be edited");
      return;
    }
    const toCond = (x: ClassificationSummaryDto | null): ClinicalConditionDto | null =>
      x
        ? {
            id: x.id,
            name: x.name,
            description: x.description,
            icd11Code: x.icd11Code,
            icdHint: "",
            active: true,
            createdAt: "",
            updatedAt: "",
          }
        : null;
    setForm({
      chiefComplaint: note.chiefComplaint ?? "",
      historyOfPresentComplaint: note.historyOfPresentComplaint ?? "",
      examinationFindings: note.examinationFindings ?? "",
      assessment: note.assessment ?? "",
      plan: note.plan ?? "",
      provisionalDiagnosis: note.provisionalDiagnosis ?? "",
      provisionalClassification: toCond(note.provisionalClassification),
      principalClassification: toCond(note.principalClassification),
      principalCase: note.principalDiagnosisNewCase ? "new" : note.principalDiagnosisOldCase ? "old" : "",
      additional: (note.additionalDiagnoses ?? []).map((a) => ({
        key: a.id,
        classification: a.classificationId
          ? {
              id: a.classificationId,
              name: a.classificationName ?? "",
              description: a.classificationDescription,
              icd11Code: a.icd11Code ?? "",
              icdHint: "",
              active: true,
              createdAt: "",
              updatedAt: "",
            }
          : null,
        freeText: a.freeText ?? "",
        caseKind: a.newCase ? "new" : a.oldCase ? "old" : "",
      })),
    });
    setEditingNoteId(note.id);
    setShowForm(true);
  }

  const history = notesQuery.data ?? [];
  const sortedNotes = useMemo(
    () => [...history].sort((a, b) => (b.authoredAt ?? "").localeCompare(a.authoredAt ?? "")),
    [history],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Consultations & Nursing Notes</p>
          <p className="text-xs text-muted-foreground">
            {history.length} note{history.length === 1 ? "" : "s"} on file
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingNoteId(null);
              setForm(EMPTY_FORM);
            } else {
              setShowForm(true);
            }
          }}
          disabled={!visit}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : editingNoteId ? "Edit Note" : "Add Note"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingNoteId ? "Edit Clinical Note" : "New Clinical Note"}</CardTitle>
            <CardDescription>SOAP-style note attached to visit {visit?.visitNo}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <RecordsField label="Chief Complaint">
                <Textarea
                  value={form.chiefComplaint}
                  onChange={(e) => updateForm("chiefComplaint", e.target.value)}
                  rows={2}
                />
              </RecordsField>
              <RecordsField label="History of Presenting Complaint">
                <Textarea
                  value={form.historyOfPresentComplaint}
                  onChange={(e) => updateForm("historyOfPresentComplaint", e.target.value)}
                  rows={2}
                />
              </RecordsField>
              <RecordsField label="Examination Findings">
                <Textarea
                  value={form.examinationFindings}
                  onChange={(e) => updateForm("examinationFindings", e.target.value)}
                  rows={2}
                />
              </RecordsField>
              <RecordsField label="Assessment">
                <Textarea value={form.assessment} onChange={(e) => updateForm("assessment", e.target.value)} rows={2} />
              </RecordsField>
              <RecordsField label="Plan" className="sm:col-span-2">
                <Textarea value={form.plan} onChange={(e) => updateForm("plan", e.target.value)} rows={2} />
              </RecordsField>

              <RecordsField label="Provisional diagnosis (free text)" className="sm:col-span-2">
                <Textarea
                  value={form.provisionalDiagnosis}
                  onChange={(e) => updateForm("provisionalDiagnosis", e.target.value)}
                  rows={2}
                  placeholder="Suspected morbidity in narrative form"
                />
              </RecordsField>

              <RecordsField label="Provisional classification *" className="sm:col-span-2">
                <ClassificationPicker
                  valueId={form.provisionalClassification?.id ?? null}
                  selection={form.provisionalClassification}
                  onChange={(next) => updateForm("provisionalClassification", next)}
                />
              </RecordsField>

              <RecordsField label="Principal diagnosis" className="sm:col-span-2">
                <ClassificationPicker
                  valueId={form.principalClassification?.id ?? null}
                  selection={form.principalClassification}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      principalClassification: next,
                      principalCase: next ? prev.principalCase : "",
                    }))
                  }
                />
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox
                      checked={form.principalCase === "new"}
                      disabled={!form.principalClassification}
                      onCheckedChange={(v) =>
                        updateForm("principalCase", v ? "new" : form.principalCase === "new" ? "" : form.principalCase)
                      }
                    />
                    New case
                  </label>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox
                      checked={form.principalCase === "old"}
                      disabled={!form.principalClassification}
                      onCheckedChange={(v) =>
                        updateForm("principalCase", v ? "old" : form.principalCase === "old" ? "" : form.principalCase)
                      }
                    />
                    Old case
                  </label>
                </div>
              </RecordsField>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Additional diagnoses</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateForm("additional", [...form.additional, emptyAdditionalRow()])}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add diagnosis
                </Button>
              </div>
              {form.additional.length === 0 ? (
                <p className="text-xs text-muted-foreground">No additional rows — use Add diagnosis if needed.</p>
              ) : (
                <div className="space-y-4">
                  {form.additional.map((row, idx) => (
                    <div key={row.key} className="rounded-md border border-dashed border-border bg-background p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Diagnosis {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          onClick={() =>
                            updateForm(
                              "additional",
                              form.additional.filter((r) => r.key !== row.key),
                            )
                          }
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <ClassificationPicker
                        valueId={row.classification?.id ?? null}
                        selection={row.classification}
                        onChange={(next) => {
                          const copy = [...form.additional];
                          copy[idx] = { ...row, classification: next };
                          updateForm("additional", copy);
                        }}
                      />
                      <Textarea
                        rows={2}
                        placeholder="Optional free-text diagnosis if not in catalogue"
                        value={row.freeText}
                        onChange={(e) => {
                          const copy = [...form.additional];
                          copy[idx] = { ...row, freeText: e.target.value };
                          updateForm("additional", copy);
                        }}
                      />
                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={row.caseKind === "new"}
                            onCheckedChange={(v) => {
                              const copy = [...form.additional];
                              copy[idx] = { ...row, caseKind: v ? "new" : row.caseKind === "new" ? "" : row.caseKind };
                              updateForm("additional", copy);
                            }}
                          />
                          New case
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={row.caseKind === "old"}
                            onCheckedChange={(v) => {
                              const copy = [...form.additional];
                              copy[idx] = { ...row, caseKind: v ? "old" : row.caseKind === "old" ? "" : row.caseKind };
                              updateForm("additional", copy);
                            }}
                          />
                          Old case
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                {editingNoteId ? "Update Note" : "Save Note"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {notesQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notes…
          </CardContent>
        </Card>
      ) : sortedNotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No consultation notes recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <FolderRecordFeedBanner>
            Each note shows SOAP fields and classifications — expand for the full clinical narrative captured at that time.
          </FolderRecordFeedBanner>
          {sortedNotes.map((n, idx) => {
            const titleBits =
              summarizeClassification(n.provisionalClassification) ||
              (n.chiefComplaint?.trim() ? n.chiefComplaint.trim().slice(0, 120) : "Clinical note");
            const extended =
              n.chiefComplaint && n.chiefComplaint.trim().length > 120 ? `${titleBits}…` : titleBits;
            return (
              <FolderRecordExpandableRow
                key={n.id}
                railIndex={sortedNotes.length - idx}
                icon={FileText}
                eyebrow={`${n.authoredRole.replace(/_/g, " ").toLowerCase()} · consultation`}
                title={<span className="font-normal">{extended}</span>}
                preview={<span>{n.authoredByName}</span>}
                footerTime={n.authoredAt}
                headerActions={
                  isSameDayEditable(n) ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => beginEdit(n)}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null
                }
                badges={
                  n.icd10Code ? (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-clinical text-xs">
                      ICD-10 {n.icd10Code}
                    </span>
                  ) : null
                }
              >
                <div className="space-y-4">
                  <FolderRecordField label="Chief complaint" value={n.chiefComplaint?.trim() || null} />
                  <FolderRecordField label="History of presenting complaint" value={n.historyOfPresentComplaint?.trim() || null} />
                  <FolderRecordField label="Examination findings" value={n.examinationFindings?.trim() || null} />
                  <FolderRecordField label="Assessment" value={n.assessment?.trim() || null} />
                  <FolderRecordField label="Plan" value={n.plan?.trim() || null} />
                  <FolderRecordField label="Provisional (free text)" value={n.provisionalDiagnosis?.trim() || null} />
                  <FolderRecordField
                    label="Provisional classification"
                    value={summarizeClassification(n.provisionalClassification)}
                  />
                  <FolderRecordField
                    label={`Principal (${
                      n.principalDiagnosisNewCase ? "new case" : n.principalDiagnosisOldCase ? "old case" : "—"
                    })`}
                    value={summarizeClassification(n.principalClassification)}
                  />
                  {n.additionalDiagnoses && n.additionalDiagnoses.length > 0 ? (
                    <FolderRecordField
                      label="Additional diagnoses"
                      value={
                        <ul className="list-inside list-disc space-y-1">
                          {n.additionalDiagnoses.map((a: ConsultationNoteAdditionalDiagnosisDto) => (
                            <li key={a.id}>{formatAdditionalHistoryLine(a)}</li>
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
    </div>
  );
}

function formatAdditionalHistoryLine(a: ConsultationNoteAdditionalDiagnosisDto): string {
  const kind = a.newCase ? "new case" : a.oldCase ? "old case" : "";
  const base =
    a.classificationName && a.classificationDescription?.trim()
      ? `${a.classificationName} — ${a.classificationDescription}`
      : (a.classificationName ?? "");
  const icd = a.icd11Code ? ` (${a.icd11Code})` : "";
  const ft = a.freeText?.trim();
  const text = [base + icd, ft].filter(Boolean).join(ft && base ? "; " : "");
  return `${text || "—"}${kind ? ` · ${kind}` : ""}`;
}
