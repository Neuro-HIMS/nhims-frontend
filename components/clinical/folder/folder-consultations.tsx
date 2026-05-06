"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

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
import type { CreateConsultationNotePayload } from "@/types/clinical.types";

const EMPTY_NOTE = {
  chiefComplaint: "",
  historyOfPresentComplaint: "",
  examinationFindings: "",
  assessment: "",
  plan: "",
  icd10Code: "",
};

interface FolderConsultationsProps {
  patientId: string;
  visit: Visit | null;
  authoredBy: string;
}

export function FolderConsultations({ visit }: FolderConsultationsProps) {
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
      setForm(EMPTY_NOTE);
      setShowForm(false);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not save note");
    },
  });

  const [form, setForm] = useState(EMPTY_NOTE);
  const [showForm, setShowForm] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
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
    createMut.mutate({ ...form, authoredRole: role });
  }

  const history = notesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Consultations & Nursing Notes</p>
          <p className="text-xs text-muted-foreground">{history.length} note{history.length === 1 ? "" : "s"} on file</p>
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
                <Textarea value={form.chiefComplaint} onChange={(e) => update("chiefComplaint", e.target.value)} rows={2} />
              </RecordsField>
              <RecordsField label="History of Presenting Complaint">
                <Textarea value={form.historyOfPresentComplaint} onChange={(e) => update("historyOfPresentComplaint", e.target.value)} rows={2} />
              </RecordsField>
              <RecordsField label="Examination Findings">
                <Textarea value={form.examinationFindings} onChange={(e) => update("examinationFindings", e.target.value)} rows={2} />
              </RecordsField>
              <RecordsField label="Assessment">
                <Textarea value={form.assessment} onChange={(e) => update("assessment", e.target.value)} rows={2} />
              </RecordsField>
              <RecordsField label="Plan" className="sm:col-span-2">
                <Textarea value={form.plan} onChange={(e) => update("plan", e.target.value)} rows={2} />
              </RecordsField>
              <RecordsField label="ICD-10 Code">
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs ring-offset-background"
                  value={form.icd10Code}
                  onChange={(e) => update("icd10Code", e.target.value.toUpperCase())}
                  placeholder="Optional"
                />
              </RecordsField>
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {n.authoredRole.toLowerCase()} · {n.authoredAt ? formatDateTime(n.authoredAt) : "—"} · {n.authoredByName}
                  </p>
                  {n.icd10Code && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-clinical text-xs">
                      {n.icd10Code}
                    </span>
                  )}
                </div>
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

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="whitespace-pre-line text-foreground">{value}</span>
    </div>
  );
}
