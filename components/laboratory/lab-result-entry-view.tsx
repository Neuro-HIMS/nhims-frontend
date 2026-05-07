"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import {
  emptyMalariaPanel,
  LabMalariaPanelForm,
  malariaPanelHasSignal,
  parseMalariaPanelJson,
} from "@/components/laboratory/lab-malaria-panel-form";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
import type {
  LabOrderDto,
  LabSourceOfRequest,
  SubmitLabResultsPayload,
} from "@/types/clinical.types";

interface RowDraft {
  analyte: string;
  value: string;
  units: string;
  referenceRange: string;
  flag: string;
  comment: string;
}

function blankRow(): RowDraft {
  return { analyte: "", value: "", units: "", referenceRange: "", flag: "", comment: "" };
}

function urgencyRank(o: LabOrderDto): number {
  return o.priority === "STAT" ? 0 : o.priority === "EMERGENCY" ? 1 : o.priority === "URGENT" ? 2 : 3;
}

function localDatetimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToIso(local: string): string {
  if (!local.trim()) return "";
  const x = new Date(local);
  return Number.isNaN(x.getTime()) ? "" : x.toISOString();
}

function orderOnLocalDate(order: LabOrderDto, ymd: string): boolean {
  if (!order.orderedAt) return false;
  const d = new Date(order.orderedAt);
  const [y, m, day] = ymd.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

export function LabResultEntryView() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get("orderId") ?? "";

  const [filterDate, setFilterDate] = useState(() => {
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  });
  const [patientFilter, setPatientFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<LabOrderDto | null>(null);

  const eligibleQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "ENTRY_MERGED"],
    queryFn: async () => {
      const [ordered, ready, inProg] = await Promise.all([
        clinicalService.labWorklist("ORDERED"),
        clinicalService.labWorklist("READY"),
        clinicalService.labWorklist("IN_PROGRESS"),
      ]);
      const seen = new Set<string>();
      const merged = [...ordered, ...ready, ...inProg];
      return merged.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
    },
  });

  const filteredSorted = useMemo(() => {
    const pf = patientFilter.trim().toLowerCase();
    let rows = eligibleQuery.data ?? [];
    rows = rows.filter((o) => orderOnLocalDate(o, filterDate));
    if (pf) {
      rows = rows.filter(
        (o) =>
          o.patientName.toLowerCase().includes(pf) ||
          (o.patientPublicId ?? "").toLowerCase().includes(pf),
      );
    }
    return [...rows].sort(
      (a, b) =>
        urgencyRank(a) - urgencyRank(b) || (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""),
    );
  }, [eligibleQuery.data, filterDate, patientFilter]);

  useEffect(() => {
    if (!urlOrderId || !eligibleQuery.data) return;
    const hit = eligibleQuery.data.find((o) => o.id === urlOrderId);
    if (hit) {
      setActiveOrder(hit);
      setDialogOpen(true);
    }
  }, [urlOrderId, eligibleQuery.data]);

  function openDialog(o: LabOrderDto) {
    setActiveOrder(o);
    setDialogOpen(true);
  }

  if (eligibleQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading today&apos;s orders…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Result entry</CardTitle>
          <CardDescription>
            Daily queue sorted by priority then time. Charges sit on the encounter bill — capture worksheet fields and
            authorise when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date (ordered)</label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44" />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Search patient</label>
            <Input
              placeholder="Name or patient ID…"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              disabled={filteredSorted.length === 0}
              onClick={() => openDialog(filteredSorted[0])}
            >
              Add results (first in list)
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredSorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FlaskConical className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No orders match this date / filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Time
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Test
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Priority
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSorted.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {o.orderedAt ? formatDateTime(o.orderedAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{o.patientName}</p>
                    <p className="patient-id mt-0.5">{o.patientPublicId}</p>
                  </td>
                  <td className="px-4 py-2.5">{o.serviceName}</td>
                  <td className="px-4 py-2.5 text-xs">{o.priority}</td>
                  <td className="px-4 py-2.5 text-xs">{o.status}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => openDialog(o)}>
                      Add results
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LabResultEntryDialog
        open={dialogOpen && activeOrder !== null}
        order={activeOrder}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setActiveOrder(null);
        }}
        qc={qc}
      />
    </div>
  );
}

function LabResultEntryDialog({
  open,
  order,
  onOpenChange,
  qc,
}: {
  open: boolean;
  order: LabOrderDto | null;
  onOpenChange: (v: boolean) => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const malariaOrder = (order?.labResultPanel ?? "").toUpperCase() === "MALARIA_PANEL";

  const [specimenType, setSpecimenType] = useState("");
  const [sourceOfRequest, setSourceOfRequest] = useState<LabSourceOfRequest | "">("");
  const [sampleLocal, setSampleLocal] = useState(localDatetimeInputValue(new Date()));
  const [rows, setRows] = useState<RowDraft[]>([blankRow()]);
  const [summary, setSummary] = useState("");
  const [malaria, setMalaria] = useState<Record<string, unknown>>(emptyMalariaPanel());
  const [confirmAuthorise, setConfirmAuthorise] = useState<SubmitLabResultsPayload | null>(null);

  useEffect(() => {
    if (!open || !order) return;
    setSpecimenType(order.specimenType ?? "");
    setSourceOfRequest((order.sourceOfRequest as LabSourceOfRequest) || "");
    setSampleLocal(localDatetimeInputValue(new Date()));
    setRows([blankRow()]);
    setSummary("");
    setMalaria(parseMalariaPanelJson(order.malariaPanelJson));
    setConfirmAuthorise(null);
  }, [open, order]);

  const submitMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitLabResultsPayload }) =>
      clinicalService.submitLabResults(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      qc.invalidateQueries({ queryKey: queryKeys.clinical.labCriticalInbox });
      setConfirmAuthorise(null);
      toast.success("Results saved — clinician will see them in the folder");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not submit results");
    },
  });

  function updateRow(idx: number, key: keyof RowDraft, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function armSubmit() {
    if (!order) return;
    const iso = localDatetimeToIso(sampleLocal);
    if (!specimenType.trim()) {
      toast.error("Type of specimen is required");
      return;
    }
    if (!sourceOfRequest) {
      toast.error("Source of request is required");
      return;
    }
    if (!iso) {
      toast.error("Sample receipt date-time is required");
      return;
    }

    const cleaned = rows.filter((r) => r.analyte.trim() && r.value.trim());
    if (!malariaOrder && cleaned.length === 0) {
      toast.error("Enter at least one analyte with a value, or use a malaria-panel catalogue item");
      return;
    }
    if (malariaOrder && !malariaPanelHasSignal(malaria)) {
      toast.error("Complete the malaria results grid (at least one positive flag, count, or note)");
      return;
    }

    const pathologyPayload = {
      specimenType: specimenType.trim(),
      sourceOfRequest,
      sampleReceivedAt: iso,
      malariaPanel: malariaOrder ? malaria : undefined,
    };

    const payload: SubmitLabResultsPayload = {
      rows: cleaned.map((r) => ({
        analyte: r.analyte.trim(),
        value: r.value.trim(),
        units: r.units.trim(),
        referenceRange: r.referenceRange.trim(),
        flag: r.flag.trim(),
        comment: summary.trim() || r.comment.trim(),
      })),
      authoriseImmediately: true,
      pathology: pathologyPayload,
    };

    setConfirmAuthorise(payload);
  }

  async function runConfirmedSubmit() {
    if (!order || !confirmAuthorise) return;
    await submitMut.mutateAsync({ id: order.id, payload: confirmAuthorise });
  }

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-6xl lg:max-w-7xl">
          <DialogHeader>
            <DialogTitle className="text-base">Test result entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">{order.serviceName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Patient: {order.patientName} ({order.patientPublicId}) · Ordered{" "}
                {order.orderedAt ? formatDateTime(order.orderedAt) : "—"}
              </p>
              {order.reason ? <p className="mt-2 text-foreground">Clinical reason: {order.reason}</p> : null}
              {order.provisionalDiagnosisLabel ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Diagnosis snapshot: <span className="font-medium text-foreground">{order.provisionalDiagnosisLabel}</span>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                <ShieldCheck className="mr-1 inline h-3 w-3" /> Full folder access remains restricted — worksheet only.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Type of specimen *</label>
                <Input value={specimenType} onChange={(e) => setSpecimenType(e.target.value)} placeholder="e.g. EDTA blood" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Source of request *</label>
                <Select value={sourceOfRequest || undefined} onValueChange={(v) => setSourceOfRequest(v as LabSourceOfRequest)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTING_ROOM">Consulting room</SelectItem>
                    <SelectItem value="WARD">Ward</SelectItem>
                    <SelectItem value="ANC">ANC</SelectItem>
                    <SelectItem value="WALK_IN">Walk-in</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Name of prescriber</label>
                <Input value={order.orderedByName} readOnly className="bg-muted/40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Pathology number</label>
                <Input
                  value={order.pathologyNumber ?? "(assigned when you save)"}
                  readOnly
                  className="bg-muted/40 font-clinical text-xs"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-foreground">Date/time sample received in lab *</label>
                <Input type="datetime-local" value={sampleLocal} onChange={(e) => setSampleLocal(e.target.value)} />
              </div>
            </div>

            {malariaOrder ? <LabMalariaPanelForm value={malaria} onChange={setMalaria} /> : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Analyte rows {malariaOrder ? "(optional add-ons)" : "*"}</p>
              {rows.map((r, idx) => (
                <div key={idx} className="grid items-end gap-2 sm:grid-cols-[1.4fr_1fr_0.7fr_1fr_0.7fr_auto]">
                  <Input placeholder="Analyte" value={r.analyte} onChange={(e) => updateRow(idx, "analyte", e.target.value)} />
                  <Input
                    placeholder="Value"
                    value={r.value}
                    onChange={(e) => updateRow(idx, "value", e.target.value)}
                    className="font-clinical"
                  />
                  <Input placeholder="Units" value={r.units} onChange={(e) => updateRow(idx, "units", e.target.value)} />
                  <Input
                    placeholder="Ref range"
                    value={r.referenceRange}
                    onChange={(e) => updateRow(idx, "referenceRange", e.target.value)}
                  />
                  <Select value={r.flag || "OK"} onValueChange={(v) => updateRow(idx, "flag", v === "OK" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">Normal</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, blankRow()])}>
                <Plus className="mr-1.5 h-4 w-4" /> Add row
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Comment / interpretation</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                placeholder="Optional comment for the clinician…"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => armSubmit()} disabled={submitMut.isPending}>
              {submitMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Authorise and report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmAuthorise !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmAuthorise(null);
        }}
        title="Authorise results to the clinician?"
        description={`This publishes results for ${order.patientName}. Pathology number will be issued if not already assigned.`}
        confirmLabel="Authorise"
        pending={submitMut.isPending}
        onConfirm={() => runConfirmedSubmit()}
      />
    </>
  );
}
