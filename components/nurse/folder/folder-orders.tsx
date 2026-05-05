"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Pill, Save, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type {
  LabOrder,
  OrderUrgency,
  PrescriptionLine,
  RadiologyOrder,
  Visit,
} from "@/lib/clinical-types";

const LAB_CATALOG = [
  { code: "FBC", name: "Full Blood Count", category: "Haematology", fee: 60 },
  { code: "MAL", name: "Malaria RDT", category: "Parasitology", fee: 25 },
  { code: "FBG", name: "Fasting Blood Glucose", category: "Chemistry", fee: 30 },
  { code: "UMC", name: "Urine M/C/S", category: "Microbiology", fee: 80 },
  { code: "HBA", name: "HbA1c", category: "Chemistry", fee: 90 },
  { code: "LFT", name: "Liver Function Tests", category: "Chemistry", fee: 110 },
  { code: "RFT", name: "Renal Function Tests", category: "Chemistry", fee: 110 },
  { code: "ECG", name: "Electrocardiogram", category: "Cardiology", fee: 75 },
];

const RAD_CATALOG = [
  { name: "Chest X-Ray (PA)", modality: "X-Ray", fee: 120 },
  { name: "Abdominal Ultrasound", modality: "Ultrasound", fee: 180 },
  { name: "Obstetric Ultrasound", modality: "Ultrasound", fee: 200 },
  { name: "CT Brain (Plain)", modality: "CT", fee: 950 },
  { name: "MRI Lumbar Spine", modality: "MRI", fee: 1800 },
];

const DRUG_CATALOG: { name: string; strength: string; form: string; fee: number }[] = [
  { name: "Paracetamol", strength: "500mg", form: "Tablet", fee: 0.5 },
  { name: "Amoxicillin", strength: "500mg", form: "Capsule", fee: 1.2 },
  { name: "Artemether/Lumefantrine", strength: "20/120mg", form: "Tablet", fee: 2.0 },
  { name: "Metformin", strength: "500mg", form: "Tablet", fee: 0.6 },
  { name: "Lisinopril", strength: "5mg", form: "Tablet", fee: 0.8 },
  { name: "Ibuprofen", strength: "400mg", form: "Tablet", fee: 0.4 },
  { name: "ORS Sachet", strength: "—", form: "Sachet", fee: 1.5 },
];

const ROUTES = ["Oral (PO)", "Intravenous (IV)", "Intramuscular (IM)", "Topical", "Inhalation"];
const FREQUENCIES = ["OD (once daily)", "BD (twice daily)", "TDS (three times daily)", "QID (four times daily)", "PRN (as needed)", "STAT"];

interface FolderOrdersProps {
  patientId: string;
  visit: Visit | null;
  user: string;
  canOrder: boolean;
}

export function FolderOrders({ patientId, visit, user, canOrder }: FolderOrdersProps) {
  const labOrders = useEncountersStore((s) => s.labOrders);
  const prescriptions = useEncountersStore((s) => s.prescriptions);
  const radOrders = useEncountersStore((s) => s.radiologyOrders);
  const orderLab = useEncountersStore((s) => s.orderLab);
  const prescribe = useEncountersStore((s) => s.prescribe);
  const orderRadiology = useEncountersStore((s) => s.orderRadiology);

  const patientLabs = useMemo(
    () => labOrders.filter((l) => l.patientId === patientId).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)),
    [labOrders, patientId]
  );
  const patientRx = useMemo(
    () => prescriptions.filter((r) => r.patientId === patientId).sort((a, b) => b.prescribedAt.localeCompare(a.prescribedAt)),
    [prescriptions, patientId]
  );
  const patientRads = useMemo(
    () => radOrders.filter((r) => r.patientId === patientId).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)),
    [radOrders, patientId]
  );

  const [showLabForm, setShowLabForm] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);
  const [showRadForm, setShowRadForm] = useState(false);

  return (
    <div className="space-y-4">
      {/* ── Lab orders ───────────────────────────────────────── */}
      <SectionHeader
        title="Laboratory Orders"
        count={patientLabs.length}
        action={canOrder && visit ? (
          <Button size="sm" onClick={() => setShowLabForm((s) => !s)}>
            <Plus className="mr-1.5 h-4 w-4" /> {showLabForm ? "Cancel" : "Order Lab"}
          </Button>
        ) : null}
      />
      {showLabForm && visit && (
        <LabOrderForm visit={visit} user={user} onCreate={(payload) => { orderLab(payload); setShowLabForm(false); toast.success("Lab order placed - billing line generated"); }} />
      )}
      <LabOrderList orders={patientLabs} />

      {/* ── Prescriptions ────────────────────────────────────── */}
      <SectionHeader
        title="Prescriptions"
        count={patientRx.length}
        action={canOrder && visit ? (
          <Button size="sm" onClick={() => setShowRxForm((s) => !s)}>
            <Plus className="mr-1.5 h-4 w-4" /> {showRxForm ? "Cancel" : "Prescribe"}
          </Button>
        ) : null}
      />
      {showRxForm && visit && (
        <PrescriptionForm visit={visit} user={user} onCreate={(lines) => {
          prescribe({
            visitId: visit.id,
            patientId: visit.patientId,
            patientName: visit.patientName,
            patientSex: visit.patientSex,
            patientDob: visit.patientDob,
            prescribedBy: user,
            lines,
          });
          setShowRxForm(false);
          toast.success(`${lines.length} item(s) sent to pharmacy queue`);
        }} />
      )}
      <PrescriptionList rxList={patientRx} />

      {/* ── Radiology orders ─────────────────────────────────── */}
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

// ── Lab ─────────────────────────────────────────────────────────────────

function LabOrderForm({
  visit,
  user,
  onCreate,
}: {
  visit: Visit;
  user: string;
  onCreate: (input: Parameters<ReturnType<typeof useEncountersStore.getState>["orderLab"]>[0]) => void;
}) {
  const [code, setCode] = useState(LAB_CATALOG[0].code);
  const [urgency, setUrgency] = useState<OrderUrgency>("routine");
  const [notes, setNotes] = useState("");

  const test = LAB_CATALOG.find((t) => t.code === code) ?? LAB_CATALOG[0];

  function submit() {
    onCreate({
      visitId: visit.id,
      patientId: visit.patientId,
      patientName: visit.patientName,
      patientSex: visit.patientSex,
      patientDob: visit.patientDob,
      testCode: test.code,
      testName: test.name,
      category: test.category,
      clinicalNotes: notes.trim(),
      urgency,
      orderedBy: user,
      fee: test.fee,
    });
    setNotes("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Lab Order</CardTitle>
        <CardDescription>Will appear in the laboratory worklist with billing line.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <RecordsField label="Test *">
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LAB_CATALOG.map((t) => (
                  <SelectItem key={t.code} value={t.code}>{t.name} - GHS {t.fee}</SelectItem>
                ))}
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
            <Input value={`GHS ${test.fee.toFixed(2)}`} readOnly className="font-clinical" />
          </RecordsField>
        </div>
        <RecordsField label="Clinical Notes / Question">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this test needed? Provisional diagnosis…" rows={2} />
        </RecordsField>
        <div className="flex justify-end">
          <Button onClick={submit}>
            <Save className="mr-1.5 h-4 w-4" />
            Place Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LabOrderList({ orders }: { orders: LabOrder[] }) {
  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <FlaskConical className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No lab orders for this patient.</p>
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
                <p className="text-sm font-medium text-foreground">{o.testName} <span className="text-xs text-muted-foreground">· {o.category}</span></p>
                <p className="patient-id mt-0.5">{o.id} · {formatDateTime(o.orderedAt)} · {o.orderedBy}</p>
                {o.clinicalNotes && <p className="mt-1 text-sm text-muted-foreground">{o.clinicalNotes}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`status-pill text-xs ${o.urgency === "stat" ? "bg-[hsl(var(--clinical-emergency))] text-white" : o.urgency === "urgent" ? "bg-[hsl(var(--clinical-urgent))] text-white" : "status-pill-pending"}`}>{o.urgency.toUpperCase()}</span>
                <span className={`status-pill text-xs ${o.status === "completed" ? "status-pill-active" : o.status === "cancelled" ? "status-pill-inactive" : "status-pill-pending"}`}>{o.status}</span>
              </div>
            </div>
            {o.results && o.results.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Results - reported by {o.resultEnteredBy} on {o.resultEnteredAt ? formatDateTime(o.resultEnteredAt) : ""}</p>
                <table className="w-full text-xs">
                  <tbody>
                    {o.results.map((r) => (
                      <tr key={r.analyte} className="border-t border-border first:border-t-0">
                        <td className="py-1 font-medium">{r.analyte}</td>
                        <td className="py-1 font-clinical">{r.value} {r.unit}</td>
                        <td className="py-1 text-muted-foreground">Ref: {r.refRange}</td>
                        <td className="py-1">
                          <span className={`status-pill text-xs ${r.flag === "critical" ? "bg-[hsl(var(--clinical-emergency))] text-white" : r.flag === "high" || r.flag === "low" ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]" : "status-pill-active"}`}>{r.flag}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {o.resultSummary && <p className="mt-2 text-xs text-foreground">{o.resultSummary}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Prescriptions ───────────────────────────────────────────────────────

function PrescriptionForm({
  visit,
  user,
  onCreate,
}: {
  visit: Visit;
  user: string;
  onCreate: (lines: Omit<PrescriptionLine, "id">[]) => void;
}) {
  const [lines, setLines] = useState<Omit<PrescriptionLine, "id">[]>([blankLine()]);

  function blankLine(): Omit<PrescriptionLine, "id"> {
    return {
      drug: "",
      strength: "",
      form: "Tablet",
      route: "Oral (PO)",
      frequency: "BD (twice daily)",
      durationDays: 5,
      quantity: 10,
      instructions: "",
      fee: 0,
    };
  }

  function update<K extends keyof Omit<PrescriptionLine, "id">>(idx: number, key: K, value: Omit<PrescriptionLine, "id">[K]) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }

  function pickDrug(idx: number, drugLabel: string) {
    const c = DRUG_CATALOG.find((d) => `${d.name} ${d.strength}` === drugLabel);
    if (c) {
      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, drug: c.name, strength: c.strength, form: c.form, fee: c.fee } : l)));
    } else {
      update(idx, "drug", drugLabel);
    }
  }

  function submit() {
    const cleaned = lines
      .filter((l) => l.drug.trim() && l.strength.trim())
      .map((l) => ({ ...l, drug: l.drug.trim(), strength: l.strength.trim(), instructions: l.instructions.trim() }));
    if (cleaned.length === 0) {
      toast.error("Add at least one drug with name and strength");
      return;
    }
    onCreate(cleaned);
    setLines([blankLine()]);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Prescription</CardTitle>
        <CardDescription>Each line creates a separate pharmacy task and billing line.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lines.map((l, idx) => (
          <div key={idx} className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <RecordsField label="Drug" className="lg:col-span-2">
                <Input
                  list={`drug-options-${idx}`}
                  value={l.drug ? `${l.drug}${l.strength ? " " + l.strength : ""}` : ""}
                  onChange={(e) => pickDrug(idx, e.target.value)}
                  placeholder="Search drug…"
                />
                <datalist id={`drug-options-${idx}`}>
                  {DRUG_CATALOG.map((d) => <option key={`${d.name}-${d.strength}`} value={`${d.name} ${d.strength}`} />)}
                </datalist>
              </RecordsField>
              <RecordsField label="Route">
                <Select value={l.route} onValueChange={(v) => update(idx, "route", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Frequency">
                <Select value={l.frequency} onValueChange={(v) => update(idx, "frequency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Days">
                <Input type="number" min={1} value={l.durationDays} onChange={(e) => update(idx, "durationDays", parseInt(e.target.value) || 0)} className="font-clinical" />
              </RecordsField>
              <RecordsField label="Qty">
                <Input type="number" min={1} value={l.quantity} onChange={(e) => update(idx, "quantity", parseInt(e.target.value) || 0)} className="font-clinical" />
              </RecordsField>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <RecordsField label="Instructions">
                <Input value={l.instructions} onChange={(e) => update(idx, "instructions", e.target.value)} placeholder="Take after meals, complete the course…" />
              </RecordsField>
              <RecordsField label="Unit Fee">
                <Input type="number" min={0} step={0.1} value={l.fee} onChange={(e) => update(idx, "fee", parseFloat(e.target.value) || 0)} className="font-clinical" />
              </RecordsField>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, blankLine()])}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Drug
          </Button>
          <Button onClick={submit}>
            <Save className="mr-1.5 h-4 w-4" />
            Send to Pharmacy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PrescriptionList({ rxList }: { rxList: ReturnType<typeof useEncountersStore.getState>["prescriptions"] }) {
  if (rxList.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <Pill className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No prescriptions on file.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {rxList.map((rx) => (
        <Card key={rx.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{rx.lines.length} item{rx.lines.length === 1 ? "" : "s"} · {rx.id}</p>
                <p className="patient-id mt-0.5">{formatDateTime(rx.prescribedAt)} · {rx.prescribedBy}</p>
              </div>
              <span className={`status-pill text-xs ${rx.status === "dispensed" ? "status-pill-active" : rx.status === "cancelled" ? "status-pill-inactive" : "status-pill-pending"}`}>{rx.status}</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                {rx.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 font-medium">{l.drug} {l.strength}</td>
                    <td className="py-1.5 text-muted-foreground">{l.route} · {l.frequency} · {l.durationDays}d · qty {l.quantity}</td>
                    <td className="py-1.5">
                      <span className={`status-pill text-xs ${(l.dispensedQty ?? 0) >= l.quantity ? "status-pill-active" : (l.dispensedQty ?? 0) > 0 ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]" : "status-pill-pending"}`}>
                        {(l.dispensedQty ?? 0) >= l.quantity ? "Dispensed" : (l.dispensedQty ?? 0) > 0 ? `${l.dispensedQty}/${l.quantity}` : "Awaiting"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rx.pharmacyNotes && <p className="text-xs text-muted-foreground"><strong>Pharmacy notes:</strong> {rx.pharmacyNotes}</p>}
          </CardContent>
        </Card>
      ))}
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

export { LAB_CATALOG, RAD_CATALOG, DRUG_CATALOG };
