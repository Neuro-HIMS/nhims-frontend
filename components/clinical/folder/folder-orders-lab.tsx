"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, Plus, Save } from "lucide-react";
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
import {
  LabMalariaPanelReadonly,
  malariaPanelHasSignal,
  parseMalariaPanelJson,
} from "@/components/laboratory/lab-malaria-panel-form";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type { CreateLabOrderPayload, LabOrderDto } from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

interface FolderOrdersLabProps {
  visit: Visit | null;
  canOrder: boolean;
}

/**
 * Lab orders tab inside the patient folder. Wraps the new
 * `/clinical/encounters/{id}/lab-orders` API and the clinical catalog
 * lookup so clinicians can pick a real LAB-group service to order.
 */
export function FolderOrdersLab({ visit, canOrder }: FolderOrdersLabProps) {
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.labOrders(visit.id) : ["clinical", "lab-orders", "idle"],
    queryFn: () => clinicalService.listLabOrdersForEncounter(visit!.id),
    enabled: Boolean(visit),
  });

  const catalogQuery = useQuery({
    queryKey: ["clinical", "catalog", "LAB"],
    queryFn: () => clinicalService.catalog("LAB"),
  });

  const placeMut = useMutation({
    mutationFn: (payload: CreateLabOrderPayload) => clinicalService.placeLabOrder(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.today });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.labWorklist });
      toast.success("Lab order placed — charge added to encounter bill (paid at billing)");
      setShowForm(false);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not place lab order");
    },
  });

  const [showForm, setShowForm] = useState(false);

  const orders = ordersQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Laboratory Orders"
        count={orders.length}
        action={
          canOrder && visit ? (
            <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={placeMut.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> {showForm ? "Cancel" : "Order Lab"}
            </Button>
          ) : null
        }
      />

      {showForm && visit && (
        <LabOrderForm
          visit={visit}
          catalog={catalog}
          loading={catalogQuery.isLoading}
          submitting={placeMut.isPending}
          onCreate={(payload) => placeMut.mutate(payload)}
        />
      )}

      {ordersQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading lab orders…
          </CardContent>
        </Card>
      ) : (
        <LabOrderList orders={orders} />
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

function LabOrderForm({
  visit,
  catalog,
  loading,
  submitting,
  onCreate,
}: {
  visit: Visit;
  catalog: { id: string; serviceCode: string; serviceName: string }[];
  loading: boolean;
  submitting: boolean;
  onCreate: (input: CreateLabOrderPayload) => void;
}) {
  const notesQuery = useQuery({
    queryKey: queryKeys.clinical.consultations(visit.id),
    queryFn: () => clinicalService.listConsultationNotes(visit.id),
    enabled: Boolean(visit.id),
  });

  const diagnosisPreview = useMemo(() => {
    const rows = notesQuery.data ?? [];
    const sorted = [...rows].sort((a, b) => (b.authoredAt ?? "").localeCompare(a.authoredAt ?? ""));
    const n = sorted[0];
    if (!n) return "No consultation note on file yet — save an order only after consultation if diagnosis is required.";
    const c = n.provisionalClassification;
    if (c) return `${c.name}${c.icd11Code ? ` (${c.icd11Code})` : ""}`;
    return n.provisionalDiagnosis?.trim() || "—";
  }, [notesQuery.data]);

  const [serviceId, setServiceId] = useState<string>("");
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "EMERGENCY" | "STAT">("ROUTINE");
  const [reason, setReason] = useState("");
  const [instructions, setInstructions] = useState("");

  function submit() {
    if (!serviceId) {
      toast.error("Select a lab test before placing the order");
      return;
    }
    onCreate({ serviceId, priority, reason: reason.trim(), instructions: instructions.trim() });
    setServiceId("");
    setReason("");
    setInstructions("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Lab Order</CardTitle>
        <CardDescription>
          Appears on the laboratory worklist. The fee posts to this encounter&apos;s bill — payment is handled at billing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <RecordsField label="Test requested *">
            <Select value={serviceId} onValueChange={setServiceId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading services…" : "Pick a lab service…"} />
              </SelectTrigger>
              <SelectContent>
                {catalog.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No active LAB services configured — ask Finance to add them
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
          <RecordsField label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTINE">Routine</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="STAT">STAT</SelectItem>
              </SelectContent>
            </Select>
          </RecordsField>
        </div>
        <RecordsField label="Diagnosis (from consultation)">
          <Input readOnly value={notesQuery.isLoading ? "Loading…" : diagnosisPreview} className="bg-muted/40 text-sm" />
        </RecordsField>
        <RecordsField label="Clinical reason">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Clinical question or reason for test…" />
        </RecordsField>
        <RecordsField label="Lab instructions">
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Sample handling, fasting status, etc." />
        </RecordsField>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting || !serviceId}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Place Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LabOrderList({ orders }: { orders: LabOrderDto[] }) {
  const sorted = useMemo(
    () => [...orders].sort((a, b) => (b.orderedAt ?? "").localeCompare(a.orderedAt ?? "")),
    [orders],
  );

  if (sorted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <FlaskConical className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No lab orders for this encounter.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <FolderRecordFeedBanner>
        Expand an order to view worksheet metadata (specimen, pathology number), malaria panels when used, and the full
        analyte table returned from the laboratory.
      </FolderRecordFeedBanner>
      {sorted.map((order, idx) => {
        const malariaParsed = parseMalariaPanelJson(order.malariaPanelJson);
        const malariaSignal = malariaPanelHasSignal(malariaParsed);
        const analytes = order.results.length > 0;
        const resultsSubtitle =
          analytes || malariaSignal
            ? `${analytes ? `${order.results.length} analyte(s)` : ""}${analytes && malariaSignal ? " · " : ""}${malariaSignal ? "Malaria worksheet" : ""}`
            : order.status === "AUTHORISED" || order.status === "COMPLETED"
              ? "No stored results yet"
              : "Awaiting lab";

        return (
          <FolderRecordExpandableRow
            key={order.id}
            railIndex={sorted.length - idx}
            icon={FlaskConical}
            eyebrow="Laboratory order"
            title={
              <span>
                {order.serviceName}{" "}
                {order.serviceCode ? (
                  <span className="text-xs font-normal text-muted-foreground">· {order.serviceCode}</span>
                ) : null}
              </span>
            }
            preview={
              <span>
                {order.orderedByName} · {order.payerType} · {resultsSubtitle}
              </span>
            }
            footerTime={order.orderedAt}
            badges={
              <>
                <span className={priorityClass(order.priority)}>{order.priority}</span>
                <span className={statusClass(order.status)}>{order.status}</span>
              </>
            }
          >
            <div className="space-y-4">
              <FolderRecordField label="Diagnosis snapshot" value={order.provisionalDiagnosisLabel?.trim() || null} />
              <FolderRecordField label="Clinical reason" value={order.reason?.trim() || null} />
              <FolderRecordField label="Lab instructions" value={order.instructions?.trim() || null} />
              <FolderRecordField label="Prescriber" value={order.orderedByName} />
              <FolderRecordField label="Payer" value={order.payerType} />
              <FolderRecordField label="Panel type" value={order.labResultPanel ?? "NONE"} />
              <FolderRecordField
                label="Ordered"
                value={order.orderedAt ? formatDateTime(order.orderedAt) : null}
              />
              <FolderRecordField
                label="Processing started"
                value={order.startedAt ? formatDateTime(order.startedAt) : null}
              />
              <FolderRecordField label="Specimen type" value={order.specimenType?.trim() || null} />
              <FolderRecordField
                label="Source of request"
                value={order.sourceOfRequest ? formatLabSource(order.sourceOfRequest) : null}
              />
              <FolderRecordField
                label="Sample received in lab"
                value={order.sampleReceivedAt ? formatDateTime(order.sampleReceivedAt) : null}
              />
              <FolderRecordField label="Pathology number" value={order.pathologyNumber?.trim() || null} />
              <FolderRecordField
                label="Completed"
                value={order.completedAt ? formatDateTime(order.completedAt) : null}
              />
              <FolderRecordField
                label="Authorised"
                value={order.authorisedAt ? formatDateTime(order.authorisedAt) : null}
              />

              {analytes || malariaSignal ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-semibold text-foreground">Authorised results</p>
                  {malariaSignal ? <LabMalariaPanelReadonly value={malariaParsed} /> : null}
                  {analytes ? (
                    <div className="overflow-x-auto rounded-lg border border-border bg-muted/20">
                      <table className="w-full min-w-[520px] text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Analyte</th>
                            <th className="px-3 py-2 font-medium">Value</th>
                            <th className="px-3 py-2 font-medium">Reference</th>
                            <th className="px-3 py-2 font-medium">Flag</th>
                            <th className="px-3 py-2 font-medium">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.results.map((r) => (
                            <tr key={r.id} className="border-t border-border">
                              <td className="px-3 py-2 font-medium">{r.analyte}</td>
                              <td className="px-3 py-2 font-clinical">
                                {r.value} {r.units}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{r.referenceRange || "—"}</td>
                              <td className="px-3 py-2">
                                <span className={flagClass(r.flag)}>{r.flag || "OK"}</span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                <span className="block max-w-[140px] truncate" title={r.recordedByName}>
                                  {r.recordedByName || "—"}
                                </span>
                                {r.recordedAt ? (
                                  <span className="block text-[10px]">{formatDateTime(r.recordedAt)}</span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FolderRecordExpandableRow>
        );
      })}
    </div>
  );
}

function formatLabSource(raw: string): string {
  const m: Record<string, string> = {
    CONSULTING_ROOM: "Consulting room",
    WARD: "Ward",
    ANC: "ANC",
    WALK_IN: "Walk-in",
    OTHER: "Other",
  };
  return m[raw] ?? raw.replace(/_/g, " ").toLowerCase();
}

function priorityClass(p: string) {
  if (p === "STAT" || p === "EMERGENCY")
    return "status-pill text-xs bg-[hsl(var(--clinical-emergency))] text-white";
  if (p === "URGENT") return "status-pill text-xs bg-[hsl(var(--clinical-urgent))] text-white";
  return "status-pill text-xs status-pill-pending";
}

function statusClass(s: string) {
  if (s === "AUTHORISED" || s === "COMPLETED") return "status-pill text-xs status-pill-active";
  if (s === "CANCELLED") return "status-pill text-xs status-pill-inactive";
  if (s === "IN_PROGRESS") return "status-pill text-xs bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]";
  return "status-pill text-xs status-pill-pending";
}

function flagClass(f: string) {
  const x = (f ?? "").toUpperCase();
  if (x === "CRITICAL" || x === "C") return "status-pill text-xs bg-[hsl(var(--clinical-emergency))] text-white";
  if (x === "HIGH" || x === "H" || x === "LOW" || x === "L")
    return "status-pill text-xs bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]";
  return "status-pill text-xs status-pill-active";
}
