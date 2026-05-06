"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
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
      toast.success("Lab order placed — billing line generated");
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
  catalog,
  loading,
  submitting,
  onCreate,
}: {
  catalog: { id: string; serviceCode: string; serviceName: string }[];
  loading: boolean;
  submitting: boolean;
  onCreate: (input: CreateLabOrderPayload) => void;
}) {
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
        <CardDescription>Will appear in the laboratory worklist with a billing line.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <RecordsField label="Test *">
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
        <RecordsField label="Clinical reason">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Provisional diagnosis or question…" />
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
    <div className="space-y-2">
      {sorted.map((o) => (
        <Card key={o.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {o.serviceName} {o.serviceCode && <span className="text-xs text-muted-foreground">· {o.serviceCode}</span>}
                </p>
                <p className="patient-id mt-0.5">
                  {o.orderedAt ? formatDateTime(o.orderedAt) : ""} · {o.orderedByName} · {o.payerType}
                </p>
                {o.reason && <p className="mt-1 text-sm text-muted-foreground">{o.reason}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={priorityClass(o.priority)}>{o.priority}</span>
                <span className={statusClass(o.status)}>{o.status}</span>
              </div>
            </div>
            {o.results.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Results
                </p>
                <table className="w-full text-xs">
                  <tbody>
                    {o.results.map((r) => (
                      <tr key={r.id} className="border-t border-border first:border-t-0">
                        <td className="py-1 font-medium">{r.analyte}</td>
                        <td className="py-1 font-clinical">
                          {r.value} {r.units}
                        </td>
                        <td className="py-1 text-muted-foreground">Ref: {r.referenceRange || "—"}</td>
                        <td className="py-1">
                          <span className={flagClass(r.flag)}>{r.flag || "OK"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
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
