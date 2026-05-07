"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import { minorToGhs } from "@/components/finance/finance-utils";
import type { ApiError } from "@/types/api.types";
import type { ClinicalServiceDto, CreateRadiologyOrderPayload } from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

interface FolderOrdersRadiologyProps {
  visit: Visit | null;
  canOrder: boolean;
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

const STATUS_LABEL: Record<string, string> = {
  ORDERED: "Awaiting payment",
  READY: "Ready for imaging",
  IN_PROGRESS: "In progress",
  COMPLETED: "Report filed",
  CANCELLED: "Cancelled",
};

function statusPill(status: string) {
  if (status === "COMPLETED") return "status-pill-active";
  if (status === "CANCELLED") return "status-pill-inactive";
  return "status-pill-pending";
}

export function FolderOrdersRadiology({ visit, canOrder }: FolderOrdersRadiologyProps) {
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.radiologyOrders(visit.id) : ["clinical", "radiology-orders", "idle"],
    queryFn: () => clinicalService.listRadiologyOrdersForEncounter(visit!.id),
    enabled: Boolean(visit),
  });

  const catalogQuery = useQuery({
    queryKey: ["clinical", "catalog", "IMAGING"],
    queryFn: () => clinicalService.catalog("IMAGING"),
  });

  const placeMut = useMutation({
    mutationFn: (payload: CreateRadiologyOrderPayload) => clinicalService.placeRadiologyOrder(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.today });
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.radiologyWorklist });
      toast.success("Imaging order placed — charge added to encounter bill");
      setShowForm(false);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not place imaging order");
    },
  });

  const [showForm, setShowForm] = useState(false);

  const orders = ordersQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Radiology / Imaging"
        count={orders.length}
        action={
          canOrder && visit ? (
            <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={placeMut.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> {showForm ? "Cancel" : "Request imaging"}
            </Button>
          ) : null
        }
      />

      {showForm && visit && (
        <RadiologyOrderForm
          catalog={catalog}
          loading={catalogQuery.isLoading}
          submitting={placeMut.isPending}
          onCreate={(payload) => placeMut.mutate(payload)}
        />
      )}

      {ordersQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading imaging orders…
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
            <ScanLine className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No imaging orders on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="space-y-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {o.studyName}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {o.modality} · {o.serviceCode}
                      </span>
                    </p>
                    <p className="patient-id mt-0.5">
                      {o.orderedAt ? formatDateTime(o.orderedAt) : "—"} · {o.orderedByName} · GH₵ {minorToGhs(o.lineTotalMinor)}
                    </p>
                    {o.clinicalNotes ? <p className="mt-1 text-sm text-muted-foreground">{o.clinicalNotes}</p> : null}
                  </div>
                  <span className={`status-pill text-xs ${statusPill(o.status)}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                {o.reportText ? (
                  <div className="rounded-md bg-muted/30 p-2 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Report — {o.reportedByName || "Radiology"}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{o.reportText}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RadiologyOrderForm({
  catalog,
  loading,
  submitting,
  onCreate,
}: {
  catalog: ClinicalServiceDto[];
  loading: boolean;
  submitting: boolean;
  onCreate: (payload: CreateRadiologyOrderPayload) => void;
}) {
  const [serviceId, setServiceId] = useState<string>("");

  useEffect(() => {
    if (catalog.length === 0) return;
    if (!serviceId || !catalog.some((c) => c.id === serviceId)) {
      setServiceId(catalog[0].id);
    }
  }, [catalog, serviceId]);

  const [priority, setPriority] = useState<CreateRadiologyOrderPayload["priority"]>("ROUTINE");
  const [clinicalNotes, setClinicalNotes] = useState("");

  function submit() {
    const sid = serviceId || catalog[0]?.id;
    if (!sid) {
      toast.error("Select an imaging service");
      return;
    }
    onCreate({
      serviceId: sid,
      priority,
      clinicalNotes: clinicalNotes.trim(),
    });
    setClinicalNotes("");
  }

  const svc = catalog.find((c) => c.id === serviceId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New imaging request</CardTitle>
        <CardDescription>Uses facility IMAGING catalogue — billing line is added like lab orders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <RecordsField label="Study / service *">
            <Select value={serviceId || catalog[0]?.id || ""} onValueChange={setServiceId} disabled={loading || catalog.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading…" : "Select service"} />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.serviceName} ({c.serviceCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as CreateRadiologyOrderPayload["priority"])}>
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
        {svc ? (
          <p className="text-xs text-muted-foreground">
            Tariff appears on the encounter bill; NHIS-covered requests become ready for imaging immediately.
          </p>
        ) : null}
        <RecordsField label="Clinical notes">
          <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={2} />
        </RecordsField>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting || catalog.length === 0}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Place order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
