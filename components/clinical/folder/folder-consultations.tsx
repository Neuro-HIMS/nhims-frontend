"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ClassificationPicker } from "@/components/clinical/classification-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { useAuthStore } from "@/store/auth.store";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { Visit } from "@/lib/clinical-types";
import type { ApiError } from "@/types/api.types";
import type {
  ClinicalConditionDto,
  ClassificationSummaryDto,
  ConsultationNoteAdditionalDiagnosisDto,
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
  return `${c.code} — ${c.description}${icd}`;
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

  const [form, setForm] = useState<ConsultFormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

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

    if (form.principalClassification && !form.principalCase) {
      toast.error("Select whether the principal diagnosis is a new case or an old case");
      return;
    }
    if (!form.principalClassification && form.principalCase) {
      toast.error("Clear principal new/old selection or pick a principal classification");
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

    createMut.mutate(payload);
  }

  const history = notesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Consultations & Nursing Notes</p>
          <p className="text-xs text-muted-foreground">
            {history.length} note{history.length === 1 ? "" : "s"} on file
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={!visit}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Add Note"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Clinical Note</CardTitle>
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

              <RecordsField label="Provisional classification (optional)" className="sm:col-span-2">
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
                    <input
                      type="radio"
                      className="accent-primary"
                      name="principal-case"
                      checked={form.principalCase === "new"}
                      disabled={!form.principalClassification}
                      onChange={() => updateForm("principalCase", "new")}
                    />
                    New case
                  </label>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input
                      type="radio"
                      className="accent-primary"
                      name="principal-case"
                      checked={form.principalCase === "old"}
                      disabled={!form.principalClassification}
                      onChange={() => updateForm("principalCase", "old")}
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
                          <input
                            type="radio"
                            className="accent-primary"
                            name={`add-case-${row.key}`}
                            checked={row.caseKind === "new"}
                            onChange={() => {
                              const copy = [...form.additional];
                              copy[idx] = { ...row, caseKind: "new" };
                              updateForm("additional", copy);
                            }}
                          />
                          New case
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            className="accent-primary"
                            name={`add-case-${row.key}`}
                            checked={row.caseKind === "old"}
                            onChange={() => {
                              const copy = [...form.additional];
                              copy[idx] = { ...row, caseKind: "old" };
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
              <Button onClick={handleSave} disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Note
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
      ) : history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No consultation notes recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((n) => (
            <Card key={n.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {n.authoredRole.toLowerCase()} · {n.authoredAt ? formatDateTime(n.authoredAt) : "—"} ·{" "}
                    {n.authoredByName}
                  </p>
                  {n.icd10Code ? (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-clinical text-xs">
                      Legacy ICD-10 {n.icd10Code}
                    </span>
                  ) : null}
                </div>
                {n.provisionalDiagnosis ? <NoteRow label="Provisional" value={n.provisionalDiagnosis} /> : null}
                {summarizeClassification(n.provisionalClassification) ? (
                  <NoteRow
                    label="Provisional classification"
                    value={summarizeClassification(n.provisionalClassification) ?? ""}
                  />
                ) : null}
                {summarizeClassification(n.principalClassification) ? (
                  <NoteRow
                    label={`Principal (${
                      n.principalDiagnosisNewCase ? "new case" : n.principalDiagnosisOldCase ? "old case" : "—"
                    })`}
                    value={summarizeClassification(n.principalClassification) ?? ""}
                  />
                ) : null}
                {n.additionalDiagnoses && n.additionalDiagnoses.length > 0 ? (
                  <div className="text-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Additional diagnoses
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-foreground">
                      {n.additionalDiagnoses.map((a: ConsultationNoteAdditionalDiagnosisDto) => (
                        <li key={a.id}>{formatAdditionalHistoryLine(a)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {n.chiefComplaint && <NoteRow label="Chief Complaint" value={n.chiefComplaint} />}
                {n.historyOfPresentComplaint && <NoteRow label="History" value={n.historyOfPresentComplaint} />}
                {n.examinationFindings && <NoteRow label="Examination" value={n.examinationFindings} />}
                {n.assessment && <NoteRow label="Assessment" value={n.assessment} />}
                {n.plan && <NoteRow label="Plan" value={n.plan} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAdditionalHistoryLine(a: ConsultationNoteAdditionalDiagnosisDto): string {
  const kind = a.newCase ? "new case" : a.oldCase ? "old case" : "";
  const base =
    a.classificationCode && a.classificationDescription
      ? `${a.classificationCode} — ${a.classificationDescription}`
      : "";
  const icd = a.icd11Code ? ` (${a.icd11Code})` : "";
  const ft = a.freeText?.trim();
  const text = [base + icd, ft].filter(Boolean).join(ft && base ? "; " : "");
  return `${text || "—"}${kind ? ` · ${kind}` : ""}`;
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="whitespace-pre-line text-foreground">{value}</span>
    </div>
  );
}
