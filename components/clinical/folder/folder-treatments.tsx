"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pill, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
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
import { treatmentStatus } from "@/lib/status-labels";
import { getFriendlyError } from "@/lib/api-errors";
import { cleanPersonName } from "@/lib/display-name";
import { canWriteTreatments } from "@/lib/permissions";
import { FREQUENCIES, ROUTES } from "@/lib/pharmacy";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/store/auth.store";

import type { TreatmentStatus } from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

const EMPTY_TX = {
  drug: "",
  dose: "",
  route: ROUTES[0] as string,
  frequency: "Twice a day",
  durationDays: "",
  instructions: "",
};

interface TreatmentsCardProps {
  /** Patient UUID (backend id, not the public folder number). */
  patientUuid: string;
  /** The open visit new treatments are recorded against; null = can't add. */
  encounterId: string | null;
  /** Show only this visit's treatments (consultation page); otherwise the whole treatment sheet. */
  onlyThisVisit?: boolean;
  /** Inside a card that already has a title. */
  bare?: boolean;
}

/** DOC-14 — treatments and procedures given in the clinic or on the ward (the treatment sheet). */
export function TreatmentsCard({ patientUuid, encounterId, onlyThisVisit = false, bare = false }: TreatmentsCardProps) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = canWriteTreatments(role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TX);

  const treatmentsQuery = useQuery({
    queryKey: queryKeys.clinical.treatments(patientUuid),
    queryFn: () => clinicalService.listTreatments(patientUuid),
    enabled: Boolean(patientUuid),
  });

  const createMut = useMutation({
    mutationFn: () =>
      clinicalService.createTreatment(patientUuid, {
        encounterId: encounterId ?? undefined,
        drug: form.drug.trim(),
        dose: form.dose.trim(),
        route: form.route,
        frequency: form.frequency,
        durationDays: parseInt(form.durationDays) || 0,
        instructions: form.instructions.trim(),
      }),
    onSuccess: () => {
      toast.success("Treatment added.");
      setForm(EMPTY_TX);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: queryKeys.clinical.treatments(patientUuid) });
    },
    onError: (err) => toast.error(getFriendlyError(err).message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TreatmentStatus }) => clinicalService.updateTreatmentStatus(id, status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.treatments(patientUuid) });
      toast.success(`Treatment marked as ${treatmentStatus(v.status).label.toLowerCase()}.`);
    },
    onError: (err) => toast.error(getFriendlyError(err).message),
  });

  const all = treatmentsQuery.data ?? [];
  const list = onlyThisVisit ? all.filter((t) => t.encounterId === encounterId) : all;

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function close() {
    setShowForm(false);
    setForm(EMPTY_TX);
  }

  const countLabel = `${list.length} treatment${list.length === 1 ? "" : "s"}${onlyThisVisit ? " on this visit" : ""}`;

  return (
    <div className={bare ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {bare ? (
          <p className="text-xs text-muted-foreground">{countLabel}</p>
        ) : (
          <div>
            <p className="text-sm font-semibold text-foreground">Treatments</p>
            <p className="text-xs text-muted-foreground">{countLabel}</p>
          </div>
        )}
        {canWrite && (
          <Button
            size="sm"
            variant={bare ? "outline" : "default"}
            onClick={() => setShowForm(true)}
            disabled={!encounterId}
            title={encounterId ? undefined : "Open the patient from a visit to add a treatment."}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add treatment
          </Button>
        )}
      </div>

      <FormDialog
        open={showForm}
        onOpenChange={(o) => (o ? setShowForm(true) : close())}
        size="lg"
        title="Add a treatment"
        description="A medicine or procedure given here in the clinic or on the ward, such as an injection, a drip or a wound dressing. For medicines the patient takes home, use Prescribe."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.drug.trim() || !form.dose.trim()}>
              {createMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Add treatment
            </Button>
          </>
        }
      >
        <FormDialogSection title="Medicine or procedure">
          <RecordsField label="Name" htmlFor="treatments-name" className="sm:col-span-2">
            <Input id="treatments-name" value={form.drug} onChange={(e) => update("drug", e.target.value)} placeholder="e.g. Artesunate injection, wound dressing" />
          </RecordsField>
          <RecordsField label="Dose" htmlFor="treatments-dose">
            <Input id="treatments-dose" value={form.dose} onChange={(e) => update("dose", e.target.value)} placeholder="e.g. 120 mg, or 1 dressing" className="font-clinical" />
          </RecordsField>
          <RecordsField label="How it's given" htmlFor="treatments-route">
            <Select value={form.route} onValueChange={(v) => update("route", v)}>
              <SelectTrigger id="treatments-route" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUTES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RecordsField>
        </FormDialogSection>
        <FormDialogSection title="How often and how long">
          <RecordsField label="How often" htmlFor="treatments-how-often">
            <Select value={form.frequency} onValueChange={(v) => update("frequency", v)}>
              <SelectTrigger id="treatments-how-often" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.code} value={f.label}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="For how many days (optional)" htmlFor="treatments-days">
            <Input id="treatments-days" inputMode="numeric" value={form.durationDays} onChange={(e) => update("durationDays", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 3" className="font-clinical" />
          </RecordsField>
          <RecordsField label="Instructions (optional)" htmlFor="treatments-instructions" className="sm:col-span-2">
            <Textarea id="treatments-instructions" value={form.instructions} onChange={(e) => update("instructions", e.target.value)} rows={2} placeholder="e.g. Give at 0, 12 and 24 hours, then daily" />
          </RecordsField>
        </FormDialogSection>
      </FormDialog>

      {treatmentsQuery.isPending ? (
        <CardSkeleton />
      ) : treatmentsQuery.isError ? (
        <ErrorState error={treatmentsQuery.error} onRetry={() => void treatmentsQuery.refetch()} />
      ) : list.length === 0 ? (
        bare ? (
          <p className="text-sm text-muted-foreground">No treatments on this visit yet.</p>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Pill className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No treatments yet.</p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {!bare && <FolderRecordFeedBanner>Open an entry for the dose, how it&apos;s given, how long, and who ordered it.</FolderRecordFeedBanner>}
          {list.map((t, idx) => {
            const s = treatmentStatus(t.status);
            return (
              <FolderRecordExpandableRow
                key={t.id}
                railIndex={list.length - idx}
                icon={Pill}
                eyebrow="Treatment"
                title={<span className="font-medium">{t.drug}</span>}
                preview={
                  <span className="font-clinical">
                    {t.dose} · {t.route} · {t.frequency}
                    {t.durationDays ? ` · ${t.durationDays} day${t.durationDays === 1 ? "" : "s"}` : ""}
                  </span>
                }
                footerTime={t.orderedAt ?? undefined}
                badges={<StatusPill tone={s.tone}>{s.label}</StatusPill>}
                headerActions={
                  canWrite ? (
                    <Select value={t.status} disabled={statusMut.isPending} onValueChange={(v) => statusMut.mutate({ id: t.id, status: v as TreatmentStatus })}>
                      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label={`Status of ${t.drug}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORDERED">{treatmentStatus("ORDERED").label}</SelectItem>
                        <SelectItem value="ADMINISTERED">{treatmentStatus("ADMINISTERED").label}</SelectItem>
                        <SelectItem value="WITHHELD">{treatmentStatus("WITHHELD").label}</SelectItem>
                        <SelectItem value="CANCELLED">{treatmentStatus("CANCELLED").label}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : undefined
                }
              >
                <div className="space-y-3">
                  <FolderRecordField label="Medicine or procedure" value={t.drug} />
                  <FolderRecordField label="Dose" value={t.dose} />
                  <FolderRecordField label="How it's given" value={t.route} />
                  <FolderRecordField label="How often" value={t.frequency} />
                  <FolderRecordField label="Days" value={t.durationDays ? String(t.durationDays) : null} />
                  <FolderRecordField label="Instructions" value={t.instructions?.trim() || null} />
                  <FolderRecordField label="Ordered by" value={cleanPersonName(t.orderedByName) || null} />
                </div>
              </FolderRecordExpandableRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Folder tab: the whole treatment sheet. */
export function FolderTreatments({ patientUuid, visit }: { patientUuid: string; visit: Visit | null }) {
  return <TreatmentsCard patientUuid={patientUuid} encounterId={visit?.id ?? null} />;
}
