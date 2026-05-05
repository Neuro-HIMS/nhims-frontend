"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { Visit } from "@/lib/clinical-types";

const EMPTY_NOTE = {
  chiefComplaint: "",
  historyOfPresentingComplaint: "",
  examinationFindings: "",
  assessment: "",
  plan: "",
};

interface FolderConsultationsProps {
  patientId: string;
  visit: Visit | null;
  authoredBy: string;
}

export function FolderConsultations({ patientId, visit, authoredBy }: FolderConsultationsProps) {
  const allNotes = useEncountersStore((s) => s.consultations);
  const addConsultation = useEncountersStore((s) => s.addConsultation);

  const [form, setForm] = useState(EMPTY_NOTE);
  const [showForm, setShowForm] = useState(false);

  const history = useMemo(
    () =>
      allNotes
        .filter((n) => n.patientId === patientId)
        .sort((a, b) => b.authoredAt.localeCompare(a.authoredAt)),
    [allNotes, patientId]
  );

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
    addConsultation({
      visitId: visit.id,
      patientId,
      ...form,
      authoredBy,
      authoredRole: "nurse",
    });
    toast.success("Nursing note saved");
    setForm(EMPTY_NOTE);
    setShowForm(false);
  }

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
                <Textarea value={form.historyOfPresentingComplaint} onChange={(e) => update("historyOfPresentingComplaint", e.target.value)} rows={2} />
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
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length === 0 ? (
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
                    {n.authoredRole} · {formatDateTime(n.authoredAt)} · {n.authoredBy}
                  </p>
                </div>
                {n.chiefComplaint && <NoteRow label="Chief Complaint" value={n.chiefComplaint} />}
                {n.historyOfPresentingComplaint && <NoteRow label="History" value={n.historyOfPresentingComplaint} />}
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
      <span className="text-foreground whitespace-pre-line">{value}</span>
    </div>
  );
}
