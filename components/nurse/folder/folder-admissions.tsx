"use client";

import { useMemo, useState } from "react";
import { BedDouble, LogOut, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecordsField } from "@/components/records/shared/records-field";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { Visit } from "@/lib/clinical-types";

const EMPTY_ADMIT = {
  ward: "",
  bed: "",
  reason: "",
};

interface FolderAdmissionsProps {
  patientId: string;
  visit: Visit | null;
  user: string;
}

export function FolderAdmissions({ patientId, visit, user }: FolderAdmissionsProps) {
  const admissions = useEncountersStore((s) => s.admissions);
  const admitPatient = useEncountersStore((s) => s.admitPatient);
  const dischargePatient = useEncountersStore((s) => s.dischargePatient);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADMIT);

  const [dischargeForId, setDischargeForId] = useState<string | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState("");

  const list = useMemo(
    () => admissions.filter((a) => a.patientId === patientId).sort((a, b) => b.admittedAt.localeCompare(a.admittedAt)),
    [admissions, patientId]
  );

  const activeAdmission = list.find((a) => !a.dischargedAt);

  function handleAdmit() {
    if (!visit) {
      toast.error("Open the patient via a visit before admitting");
      return;
    }
    if (!form.ward.trim() || !form.bed.trim()) {
      toast.error("Ward and bed are required");
      return;
    }
    admitPatient({
      patientId,
      visitId: visit.id,
      ward: form.ward.trim(),
      bed: form.bed.trim(),
      reason: form.reason.trim(),
      admittedBy: user,
    });
    toast.success("Patient admitted", { description: `${form.ward} - Bed ${form.bed}` });
    setForm(EMPTY_ADMIT);
    setShowForm(false);
  }

  function handleDischarge(id: string) {
    if (!dischargeNotes.trim()) {
      toast.error("Discharge summary is required");
      return;
    }
    dischargePatient(id, dischargeNotes.trim());
    toast.success("Patient discharged");
    setDischargeForId(null);
    setDischargeNotes("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Admissions & Discharges</p>
          <p className="text-xs text-muted-foreground">
            {activeAdmission ? `Currently admitted to ${activeAdmission.ward}, Bed ${activeAdmission.bed}` : "Not currently admitted"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={!visit || !!activeAdmission}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Admit Patient"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Admission</CardTitle>
            <CardDescription>Patient will be marked as admitted on this visit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <RecordsField label="Ward *">
                <Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} placeholder="Male Medical Ward" />
              </RecordsField>
              <RecordsField label="Bed *">
                <Input value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} placeholder="MM-12" className="font-clinical" />
              </RecordsField>
              <RecordsField label="Admitting Reason" className="sm:col-span-3">
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
              </RecordsField>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAdmit}>
                <Save className="mr-1.5 h-4 w-4" />
                Confirm Admission
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <BedDouble className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No admissions on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} className={a.dischargedAt ? "" : "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))]/40"}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {a.ward} · Bed <span className="font-clinical">{a.bed}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Admitted {formatDateTime(a.admittedAt)} by {a.admittedBy}
                    </p>
                    {a.reason && <p className="mt-1 text-sm text-foreground">{a.reason}</p>}
                  </div>
                  {a.dischargedAt ? (
                    <span className="status-pill status-pill-inactive text-xs">
                      Discharged · {formatDateTime(a.dischargedAt)}
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDischargeForId(a.id)}>
                      <LogOut className="mr-1.5 h-4 w-4" />
                      Discharge
                    </Button>
                  )}
                </div>
                {a.dischargeSummary && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Discharge Summary</p>
                    <p className="mt-1 text-foreground whitespace-pre-line">{a.dischargeSummary}</p>
                  </div>
                )}
                {dischargeForId === a.id && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <Textarea
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      placeholder="Discharge summary, follow-up plan, prescriptions on discharge…"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setDischargeForId(null); setDischargeNotes(""); }}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleDischarge(a.id)}>
                        Confirm Discharge
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
