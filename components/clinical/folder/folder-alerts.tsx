"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type {
  CreateMedicalAlertPayload,
  MedicalAlertCategory,
  MedicalAlertSeverity,
} from "@/types/clinical.types";

interface FolderAlertsProps {
  patientUuid: string;
}

const EMPTY: CreateMedicalAlertPayload = {
  category: "ALLERGY",
  label: "",
  notes: "",
  severity: "MEDIUM",
};

/**
 * Patient-scoped clinical alerts (allergies, chronic conditions, etc.).
 * Persists across visits — backed by `/clinical/patients/{id}/alerts`.
 */
export function FolderAlerts({ patientUuid }: FolderAlertsProps) {
  const qc = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: queryKeys.clinical.alerts(patientUuid),
    queryFn: () => clinicalService.listAlerts(patientUuid),
    enabled: Boolean(patientUuid),
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateMedicalAlertPayload) =>
      clinicalService.createAlert(patientUuid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Medical alert added");
      setShowForm(false);
      setForm(EMPTY);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not save alert");
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => clinicalService.deactivateAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Alert deactivated");
      setDeactivateId(null);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not deactivate alert");
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateMedicalAlertPayload>(EMPTY);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const list = alertsQuery.data ?? [];

  function handleSave() {
    if (!form.label.trim()) {
      toast.error("Alert label is required");
      return;
    }
    createMut.mutate({
      category: form.category,
      label: form.label.trim(),
      notes: form.notes?.trim(),
      severity: form.severity,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Medical Alerts</p>
          <p className="text-xs text-muted-foreground">
            Allergies, chronic conditions, and other clinical flags.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={createMut.isPending}>
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
                <Select
                  value={form.category ?? "ALLERGY"}
                  onValueChange={(v: MedicalAlertCategory) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLERGY">Allergy</SelectItem>
                    <SelectItem value="CHRONIC">Chronic Condition</SelectItem>
                    <SelectItem value="INFECTIOUS">Infectious Risk</SelectItem>
                    <SelectItem value="IMPLANT">Implant / Device</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Severity">
                <Select
                  value={form.severity ?? "MEDIUM"}
                  onValueChange={(v: MedicalAlertSeverity) => setForm({ ...form, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Label *" className="sm:col-span-2">
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Penicillin allergy"
                />
              </RecordsField>
              <RecordsField label="Details" className="sm:col-span-2">
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
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
                Save Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {alertsQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
          </CardContent>
        </Card>
      ) : list.length === 0 ? (
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
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${severityIcon(a.severity)}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {a.label}
                      <span className="ml-2 text-xs font-normal uppercase tracking-wider text-muted-foreground">
                        {a.category.toLowerCase()} · {a.severity.toLowerCase()}
                      </span>
                    </p>
                    {a.notes && <p className="mt-0.5 text-sm text-muted-foreground">{a.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.recordedAt ? formatDateTime(a.recordedAt) : ""} · {a.recordedByName}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeactivateId(a.id)}
                  disabled={removeMut.isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deactivateId !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        title="Deactivate this alert?"
        description={`The flag “${
          deactivateId ? list.find((x) => x.id === deactivateId)?.label ?? "selected alert" : ""
        }” will stop surfacing on new visits.`}
        confirmLabel="Deactivate"
        destructive
        pending={removeMut.isPending}
        onConfirm={async () => {
          if (!deactivateId) return;
          await removeMut.mutateAsync(deactivateId);
        }}
      />
    </div>
  );
}

function severityIcon(s: string) {
  if (s === "CRITICAL" || s === "HIGH") return "text-[hsl(var(--clinical-emergency))]";
  if (s === "MEDIUM") return "text-[hsl(var(--clinical-urgent))]";
  return "text-muted-foreground";
}
