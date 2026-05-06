"use client";

import { useMemo, useState } from "react";
import { Plus, Save, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { FolderOrdersLab } from "@/components/clinical/folder/folder-orders-lab";
import { FolderOrdersRx } from "@/components/clinical/folder/folder-orders-rx";
import type { OrderUrgency, RadiologyOrder, Visit } from "@/lib/clinical-types";

const RAD_CATALOG = [
  { name: "Chest X-Ray (PA)", modality: "X-Ray", fee: 120 },
  { name: "Abdominal Ultrasound", modality: "Ultrasound", fee: 180 },
  { name: "Obstetric Ultrasound", modality: "Ultrasound", fee: 200 },
  { name: "CT Brain (Plain)", modality: "CT", fee: 950 },
  { name: "MRI Lumbar Spine", modality: "MRI", fee: 1800 },
];

interface FolderOrdersProps {
  patientId: string;
  visit: Visit | null;
  user: string;
  canOrder: boolean;
}

export function FolderOrders({ patientId, visit, user, canOrder }: FolderOrdersProps) {
  const radOrders = useEncountersStore((s) => s.radiologyOrders);
  const orderRadiology = useEncountersStore((s) => s.orderRadiology);

  const patientRads = useMemo(
    () =>
      radOrders
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)),
    [radOrders, patientId],
  );

  const [showRadForm, setShowRadForm] = useState(false);

  return (
    <div className="space-y-4">
      {/* ── Lab orders ───────────────────────────────────────── */}
      <FolderOrdersLab visit={visit} canOrder={canOrder} />

      {/* ── Prescriptions ────────────────────────────────────── */}
      <FolderOrdersRx visit={visit} canOrder={canOrder} />

      {/* ── Radiology orders (legacy mock — backend in a later phase) ── */}
      <SectionHeader
        title="Radiology Orders"
        count={patientRads.length}
        action={canOrder && visit ? (
          <Button size="sm" onClick={() => setShowRadForm((s) => !s)}>
            <Plus className="mr-1.5 h-4 w-4" /> {showRadForm ? "Cancel" : "Request Imaging"}
          </Button>
        ) : null}
      />
      {showRadForm && visit && (
        <RadiologyOrderForm visit={visit} user={user} onCreate={(payload) => {
          orderRadiology(payload);
          setShowRadForm(false);
          toast.success("Radiology request sent - billing line generated");
        }} />
      )}
      <RadiologyList orders={patientRads} />
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

// ── Radiology ───────────────────────────────────────────────────────────

function RadiologyOrderForm({
  visit,
  user,
  onCreate,
}: {
  visit: Visit;
  user: string;
  onCreate: (input: Parameters<ReturnType<typeof useEncountersStore.getState>["orderRadiology"]>[0]) => void;
}) {
  const [studyName, setStudyName] = useState(RAD_CATALOG[0].name);
  const [urgency, setUrgency] = useState<OrderUrgency>("routine");
  const [notes, setNotes] = useState("");
  const study = RAD_CATALOG.find((s) => s.name === studyName) ?? RAD_CATALOG[0];

  function submit() {
    onCreate({
      visitId: visit.id,
      patientId: visit.patientId,
      patientName: visit.patientName,
      patientSex: visit.patientSex,
      patientDob: visit.patientDob,
      modality: study.modality,
      studyName: study.name,
      clinicalNotes: notes.trim(),
      urgency,
      orderedBy: user,
      fee: study.fee,
    });
    setNotes("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Radiology Request</CardTitle>
        <CardDescription>Backend wiring is queued for a later phase; this still uses the local mock.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <RecordsField label="Study *">
            <Select value={studyName} onValueChange={setStudyName}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RAD_CATALOG.map((s) => <SelectItem key={s.name} value={s.name}>{s.name} - GHS {s.fee}</SelectItem>)}
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="Urgency">
            <Select value={urgency} onValueChange={(v: OrderUrgency) => setUrgency(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="Fee">
            <Input value={`GHS ${study.fee.toFixed(2)}`} readOnly className="font-clinical" />
          </RecordsField>
        </div>
        <RecordsField label="Clinical Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </RecordsField>
        <div className="flex justify-end">
          <Button onClick={submit}>
            <Save className="mr-1.5 h-4 w-4" /> Place Request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RadiologyList({ orders }: { orders: RadiologyOrder[] }) {
  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <ScanLine className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No imaging orders on file.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{o.studyName} <span className="text-xs text-muted-foreground">· {o.modality}</span></p>
                <p className="patient-id mt-0.5">{o.id} · {formatDateTime(o.orderedAt)} · {o.orderedBy}</p>
                {o.clinicalNotes && <p className="mt-1 text-sm text-muted-foreground">{o.clinicalNotes}</p>}
              </div>
              <span className={`status-pill text-xs ${o.status === "reported" ? "status-pill-active" : o.status === "cancelled" ? "status-pill-inactive" : "status-pill-pending"}`}>{o.status}</span>
            </div>
            {o.reportText && (
              <div className="rounded-md bg-muted/30 p-2 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Report - {o.reportedBy}</p>
                <p className="mt-1 whitespace-pre-line">{o.reportText}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
