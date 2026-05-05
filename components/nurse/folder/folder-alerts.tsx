"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { MedicalAlert } from "@/lib/clinical-types";

const EMPTY = {
  category: "allergy" as MedicalAlert["category"],
  label: "",
  notes: "",
};

interface FolderAlertsProps {
  patientId: string;
  user: string;
}

export function FolderAlerts({ patientId, user }: FolderAlertsProps) {
  const alerts = useEncountersStore((s) => s.alerts);
  const addAlert = useEncountersStore((s) => s.addAlert);
  const removeAlert = useEncountersStore((s) => s.removeAlert);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const list = useMemo(
    () => alerts.filter((a) => a.patientId === patientId),
    [alerts, patientId]
  );

  function handleSave() {
    if (!form.label.trim()) {
      toast.error("Alert label is required");
      return;
    }
    addAlert({
      patientId,
      category: form.category,
      label: form.label.trim(),
      notes: form.notes.trim(),
      recordedBy: user,
    });
    toast.success("Medical alert added");
    setForm(EMPTY);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Medical Alerts</p>
          <p className="text-xs text-muted-foreground">Allergies, chronic conditions, and other clinical flags.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Add Alert"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Medical Alert</CardTitle>
            <CardDescription>Visible at the top of every visit for this patient.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <RecordsField label="Category">
                <Select value={form.category} onValueChange={(v: MedicalAlert["category"]) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allergy">Allergy</SelectItem>
                    <SelectItem value="chronic">Chronic Condition</SelectItem>
                    <SelectItem value="infectious">Infectious Risk</SelectItem>
                    <SelectItem value="implant">Implant / Device</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Label *">
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Penicillin allergy" />
              </RecordsField>
              <RecordsField label="Details" className="sm:col-span-2">
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </RecordsField>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertTriangle className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No medical alerts on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--clinical-emergency))]" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {a.label}
                      <span className="ml-2 text-xs font-normal uppercase tracking-wider text-muted-foreground">
                        {a.category}
                      </span>
                    </p>
                    {a.notes && <p className="mt-0.5 text-sm text-muted-foreground">{a.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(a.recordedAt)} · {a.recordedBy}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeAlert(a.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
