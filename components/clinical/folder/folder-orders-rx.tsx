"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pill, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
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
  ClinicalServiceDto,
  CreatePrescriptionLineInput,
  CreatePrescriptionPayload,
  PrescriptionDto,
} from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

interface FolderOrdersRxProps {
  visit: Visit | null;
  canOrder: boolean;
}

interface DraftLine extends CreatePrescriptionLineInput {
  uid: string;
}

const FORMS = ["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Ointment", "Cream", "Drops", "Inhaler", "Sachet"];
const ROUTES = ["PO", "IM", "IV", "SC", "PR", "Topical", "Inhaled", "Sublingual"];
const FREQUENCIES = ["OD (once daily)", "BD (twice daily)", "TDS (three times daily)", "QDS (four times daily)", "PRN", "Stat", "Q4H", "Q6H", "Q8H", "Q12H"];

/**
 * Prescription orders tab inside the patient folder. Posts to the new
 * `/clinical/encounters/{id}/prescriptions` endpoint, which emits one
 * BillItem per line on the encounter bill so the cashier sees the
 * cumulative cost before pharmacy dispenses.
 */
export function FolderOrdersRx({ visit, canOrder }: FolderOrdersRxProps) {
  const qc = useQueryClient();

  const rxQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.prescriptions(visit.id) : ["clinical", "prescriptions", "idle"],
    queryFn: () => clinicalService.listPrescriptionsForEncounter(visit!.id),
    enabled: Boolean(visit),
  });

  const catalogQuery = useQuery({
    queryKey: ["clinical", "catalog", "PHARMACY"],
    queryFn: () => clinicalService.catalog("PHARMACY"),
  });

  const placeMut = useMutation({
    mutationFn: (payload: CreatePrescriptionPayload) =>
      clinicalService.placePrescription(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.pharmacyQueue });
      toast.success("Prescription saved — sent to pharmacy queue");
      setShowForm(false);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not place prescription");
    },
  });

  const [showForm, setShowForm] = useState(false);

  const prescriptions = rxQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Prescriptions"
        count={prescriptions.length}
        action={
          canOrder && visit ? (
            <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={placeMut.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> {showForm ? "Cancel" : "Prescribe"}
            </Button>
          ) : null
        }
      />

      {showForm && visit && (
        <PrescriptionForm
          catalog={catalog}
          loading={catalogQuery.isLoading}
          submitting={placeMut.isPending}
          onCreate={(payload) => placeMut.mutate(payload)}
        />
      )}

      {rxQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading prescriptions…
          </CardContent>
        </Card>
      ) : (
        <PrescriptionList prescriptions={prescriptions} />
      )}
    </div>
  );
}

function SectionHeader({ title, count, action }: { title: string; count: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{count} on file</p>
      </div>
      {action}
    </div>
  );
}

function PrescriptionForm({
  catalog,
  loading,
  submitting,
  onCreate,
}: {
  catalog: ClinicalServiceDto[];
  loading: boolean;
  submitting: boolean;
  onCreate: (input: CreatePrescriptionPayload) => void;
}) {
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [notes, setNotes] = useState("");

  function blankLine(): DraftLine {
    return {
      uid: Math.random().toString(36).slice(2),
      serviceId: "",
      drugName: "",
      strength: "",
      form: "Tablet",
      route: "PO",
      frequency: "BD (twice daily)",
      durationDays: 5,
      quantity: 10,
      instructions: "",
    };
  }

  function update<K extends keyof DraftLine>(uid: string, key: K, value: DraftLine[K]) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, [key]: value } : l)));
  }

  function pickService(uid: string, serviceId: string) {
    const item = catalog.find((c) => c.id === serviceId);
    setLines((prev) =>
      prev.map((l) =>
        l.uid === uid
          ? {
              ...l,
              serviceId,
              drugName: l.drugName?.trim() ? l.drugName : (item?.serviceName ?? l.drugName),
            }
          : l,
      ),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }

  function removeLine(uid: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.uid !== uid)));
  }

  function submit() {
    const cleaned = lines
      .filter((l) => l.serviceId && l.quantity && l.quantity > 0)
      .map<CreatePrescriptionLineInput>((l) => ({
        serviceId: l.serviceId,
        drugName: l.drugName?.trim() || undefined,
        strength: l.strength?.trim() || undefined,
        form: l.form?.trim() || undefined,
        route: l.route?.trim() || undefined,
        frequency: l.frequency?.trim() || undefined,
        durationDays: l.durationDays && l.durationDays > 0 ? l.durationDays : undefined,
        quantity: Number(l.quantity),
        instructions: l.instructions?.trim() || undefined,
      }));
    if (cleaned.length === 0) {
      toast.error("Add at least one drug with quantity before saving");
      return;
    }
    onCreate({ notes: notes.trim() || undefined, lines: cleaned });
    setLines([blankLine()]);
    setNotes("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Prescription</CardTitle>
        <CardDescription>
          Each drug becomes one billing line and one row on the pharmacy worklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={line.uid} className="rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Drug {idx + 1}
                </p>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLine(line.uid)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <RecordsField label="Drug *">
                  <Select
                    value={line.serviceId}
                    onValueChange={(v) => pickService(line.uid, v)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loading ? "Loading drugs…" : "Pick a pharmacy item…"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No active PHARMACY services configured
                        </SelectItem>
                      ) : (
                        catalog.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.serviceName} {s.serviceCode ? `· ${s.serviceCode}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </RecordsField>
                <RecordsField label="Strength">
                  <Input
                    value={line.strength ?? ""}
                    onChange={(e) => update(line.uid, "strength", e.target.value)}
                    placeholder="e.g. 500mg"
                    className="font-clinical"
                  />
                </RecordsField>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <RecordsField label="Form">
                  <Select
                    value={line.form ?? "Tablet"}
                    onValueChange={(v) => update(line.uid, "form", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </RecordsField>
                <RecordsField label="Route">
                  <Select
                    value={line.route ?? "PO"}
                    onValueChange={(v) => update(line.uid, "route", v)}
                  >
                    <SelectTrigger>
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
                <RecordsField label="Frequency">
                  <Select
                    value={line.frequency ?? "BD (twice daily)"}
                    onValueChange={(v) => update(line.uid, "frequency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </RecordsField>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <RecordsField label="Duration (days)">
                  <Input
                    type="number"
                    min={0}
                    value={line.durationDays ?? 0}
                    onChange={(e) =>
                      update(line.uid, "durationDays", parseInt(e.target.value || "0", 10))
                    }
                    className="font-clinical"
                  />
                </RecordsField>
                <RecordsField label="Quantity to dispense *">
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity ?? 0}
                    onChange={(e) =>
                      update(line.uid, "quantity", parseInt(e.target.value || "0", 10))
                    }
                    className="font-clinical"
                  />
                </RecordsField>
              </div>

              <RecordsField label="Instructions / SIG">
                <Textarea
                  value={line.instructions ?? ""}
                  onChange={(e) => update(line.uid, "instructions", e.target.value)}
                  rows={2}
                  placeholder="e.g. Take with food, complete full course"
                />
              </RecordsField>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="mr-1.5 h-4 w-4" /> Add another drug
        </Button>

        <RecordsField label="Prescription notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Counselling points, follow-up plan…"
          />
        </RecordsField>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save Prescription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PrescriptionList({ prescriptions }: { prescriptions: PrescriptionDto[] }) {
  const sorted = useMemo(
    () =>
      [...prescriptions].sort((a, b) =>
        (b.prescribedAt ?? "").localeCompare(a.prescribedAt ?? ""),
      ),
    [prescriptions],
  );
  if (sorted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <Pill className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No prescriptions for this encounter.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <FolderRecordFeedBanner>
        Expand a prescription for each drug line (form, route, quantity, dispensed progress) and clinician notes.
      </FolderRecordFeedBanner>
      {sorted.map((rx, idx) => {
        const drugSummary = rx.lines
          .map((l) => l.drugName + (l.strength ? ` ${l.strength}` : ""))
          .filter(Boolean)
          .slice(0, 3)
          .join(" · ");
        return (
          <FolderRecordExpandableRow
            key={rx.id}
            railIndex={sorted.length - idx}
            icon={Pill}
            eyebrow="Prescription"
            title={<span>{rx.lines.length} medication line{rx.lines.length === 1 ? "" : "s"}</span>}
            preview={<span className="line-clamp-2">{drugSummary || "Rx bundle"}</span>}
            footerTime={rx.prescribedAt}
            badges={<span className={statusClass(rx.status)}>{prettyStatus(rx.status)}</span>}
          >
            <div className="space-y-4">
              <FolderRecordField label="Prescribed by" value={rx.prescribedByName} />
              <FolderRecordField label="Prescription notes" value={rx.notes?.trim() || null} />
              <FolderRecordField label="Pharmacy notes" value={rx.pharmacyNotes?.trim() || null} />
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Drug lines</p>
                {rx.lines.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border bg-muted/15 p-3">
                    <p className="text-sm font-medium text-foreground">
                      {l.drugName}{" "}
                      {l.strength ? <span className="text-muted-foreground">{l.strength}</span> : null}
                    </p>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                      <FolderRecordField
                        label="Sig"
                        value={[l.form, l.route, l.frequency].filter(Boolean).join(" · ") || null}
                      />
                      <FolderRecordField label="Duration (days)" value={l.durationDays ? String(l.durationDays) : null} />
                      <FolderRecordField
                        label="Dispensed / ordered"
                        value={`${Number(l.dispensedQty)} / ${Number(l.quantity)}`}
                      />
                      <FolderRecordField label="Line status" value={<span className={lineStatusClass(l.status)}>{prettyStatus(l.status)}</span>} />
                      <FolderRecordField label="Instructions" value={l.instructions?.trim() || null} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FolderRecordExpandableRow>
        );
      })}
    </div>
  );
}

function prettyStatus(s: string) {
  return s.replace(/_/g, " ").toLowerCase();
}

function statusClass(s: string) {
  if (s === "DISPENSED") return "status-pill text-xs status-pill-active";
  if (s === "CANCELLED") return "status-pill text-xs status-pill-inactive";
  if (s === "PARTIALLY_DISPENSED")
    return "status-pill text-xs bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]";
  return "status-pill text-xs status-pill-pending";
}

function lineStatusClass(s: string) {
  if (s === "DISPENSED") return "status-pill text-xs status-pill-active";
  if (s === "CANCELLED") return "status-pill text-xs status-pill-inactive";
  if (s === "PARTIALLY_DISPENSED")
    return "status-pill text-xs bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]";
  return "status-pill text-xs status-pill-pending";
}
