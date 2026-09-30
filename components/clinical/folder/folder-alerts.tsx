"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { ALERT_CATEGORY_LABELS, alertSeverity } from "@/lib/status-labels";
import { getFriendlyError } from "@/lib/api-errors";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";

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
      toast.success("Medical alert added.");
      setShowForm(false);
      setForm(EMPTY);
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => clinicalService.deactivateAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Alert removed.");
      setDeactivateId(null);
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateMedicalAlertPayload>(EMPTY);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const list = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const sorted = useMemo(
    () => [...list].sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? "")),
    [list],
  );

  function handleSave() {
    if (!form.label.trim()) {
      toast.error("Say what the alert is.");
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
          <p className="text-sm font-semibold text-foreground">Medical alerts</p>
          <p className="text-xs text-muted-foreground">
            Allergies, long-term conditions and other things every clinician should know.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={createMut.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add alert
        </Button>
      </div>

      <FormDialog
        open={showForm}
        onOpenChange={(o) => {
          setShowForm(o);
          if (!o) setForm(EMPTY);
        }}
        size="md"
        title="Add a medical alert"
        description="Shown at the top of every visit for this patient."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={createMut.isPending || !form.label.trim()}>
              {createMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save alert
            </Button>
          </>
        }
      >
        <FormDialogSection title="Alert">
          <RecordsField label="Kind" htmlFor="alerts-kind">
            <Select value={form.category ?? "ALLERGY"} onValueChange={(v: MedicalAlertCategory) => setForm({ ...form, category: v })}>
              <SelectTrigger id="alerts-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALLERGY">Allergy</SelectItem>
                <SelectItem value="CHRONIC">Long-term condition</SelectItem>
                <SelectItem value="INFECTIOUS">Infection risk</SelectItem>
                <SelectItem value="IMPLANT">Implant or device</SelectItem>
                <SelectItem value="GENERAL">Other</SelectItem>
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="How serious" htmlFor="alerts-how-serious">
            <Select value={form.severity ?? "MEDIUM"} onValueChange={(v: MedicalAlertSeverity) => setForm({ ...form, severity: v })}>
              <SelectTrigger id="alerts-how-serious" className="w-full">
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
          <RecordsField label="What it is" htmlFor="alerts-what-it-is" className="sm:col-span-2">
            <Input id="alerts-what-it-is" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Penicillin allergy" />
          </RecordsField>
          <RecordsField label="Details (optional)" htmlFor="alerts-details" className="sm:col-span-2">
            <Textarea id="alerts-details" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g. Rash and swelling in 2019" />
          </RecordsField>
        </FormDialogSection>
      </FormDialog>

      {alertsQuery.isPending ? (
        <CardSkeleton />
      ) : alertsQuery.isError ? (
        <ErrorState error={alertsQuery.error} onRetry={() => void alertsQuery.refetch()} />
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertTriangle className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No medical alerts on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <FolderRecordFeedBanner>
            Open an alert to see the details and who recorded it.
          </FolderRecordFeedBanner>
          {sorted.map((a, idx) => (
            <FolderRecordExpandableRow
              key={a.id}
              railIndex={sorted.length - idx}
              icon={AlertTriangle}
              eyebrow={ALERT_CATEGORY_LABELS[a.category] ?? "Alert"}
              title={<span>{a.label}</span>}
              preview={<span>{alertSeverity(a.severity).label} seriousness</span>}
              footerTime={a.recordedAt}
              badges={<StatusPill tone={alertSeverity(a.severity).tone}>{alertSeverity(a.severity).label}</StatusPill>}
              headerActions={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeactivateId(a.id)}
                  disabled={removeMut.isPending}
                  aria-label={`Remove alert: ${a.label}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            >
              <div className="space-y-3">
                <FolderRecordField label="What it is" value={a.label} />
                <FolderRecordField label="Kind" value={ALERT_CATEGORY_LABELS[a.category] ?? "Other"} />
                <FolderRecordField label="How serious" value={alertSeverity(a.severity).label} />
                <FolderRecordField label="Details" value={a.notes?.trim() || null} />
                <FolderRecordField label="Recorded by" value={a.recordedByName} />
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deactivateId !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        title={`Remove the alert “${deactivateId ? list.find((x) => x.id === deactivateId)?.label ?? "this alert" : ""}”?`}
        description="It will no longer show at the top of this patient's visits."
        confirmLabel="Remove alert"
        cancelLabel="Keep alert"
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

