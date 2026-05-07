"use client";

import { useMemo, useState } from "react";
import { Pill, Plus, Save } from "lucide-react";
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
import { useEncountersStore } from "@/store/encounters.store";
import type { TreatmentEntry, Visit } from "@/lib/clinical-types";

const ROUTES = ["Oral (PO)", "Intravenous (IV)", "Intramuscular (IM)", "Subcutaneous (SC)", "Topical", "Inhalation", "Rectal"];
const FREQUENCIES = ["OD (once daily)", "BD (twice daily)", "TDS (three times daily)", "QID (four times daily)", "PRN (as needed)", "STAT (immediately)"];

const EMPTY_TX = {
  drug: "",
  dose: "",
  route: "Oral (PO)",
  frequency: "BD (twice daily)",
  durationDays: "",
  instructions: "",
};

interface FolderTreatmentsProps {
  patientId: string;
  visit: Visit | null;
  prescribedBy: string;
}

export function FolderTreatments({ patientId, visit, prescribedBy }: FolderTreatmentsProps) {
  const treatments = useEncountersStore((s) => s.treatments);
  const addTreatment = useEncountersStore((s) => s.addTreatment);
  const setTreatmentStatus = useEncountersStore((s) => s.setTreatmentStatus);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TX);

  const list = useMemo(
    () => treatments.filter((t) => t.patientId === patientId).sort((a, b) => b.prescribedAt.localeCompare(a.prescribedAt)),
    [treatments, patientId]
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!visit) {
      toast.error("Open the patient via a visit to prescribe");
      return;
    }
    if (!form.drug.trim() || !form.dose.trim()) {
      toast.error("Drug name and dose are required");
      return;
    }
    addTreatment({
      visitId: visit.id,
      patientId,
      drug: form.drug.trim(),
      dose: form.dose.trim(),
      route: form.route,
      frequency: form.frequency,
      durationDays: parseInt(form.durationDays) || 0,
      instructions: form.instructions.trim(),
      prescribedBy,
    });
    toast.success("Treatment ordered");
    setForm(EMPTY_TX);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Treatment Sheet & Medications</p>
          <p className="text-xs text-muted-foreground">{list.length} entr{list.length === 1 ? "y" : "ies"}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={!visit}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Add Treatment"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Medication / Treatment Order</CardTitle>
            <CardDescription>Order will be queued for pharmacy dispense.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RecordsField label="Drug / Treatment *" className="lg:col-span-2">
                <Input value={form.drug} onChange={(e) => update("drug", e.target.value)} placeholder="e.g. Paracetamol 500mg tablets" />
              </RecordsField>
              <RecordsField label="Dose *">
                <Input value={form.dose} onChange={(e) => update("dose", e.target.value)} placeholder="e.g. 1g" className="font-clinical" />
              </RecordsField>
              <RecordsField label="Route">
                <Select value={form.route} onValueChange={(v) => update("route", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Frequency">
                <Select value={form.frequency} onValueChange={(v) => update("frequency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Duration (days)">
                <Input value={form.durationDays} onChange={(e) => update("durationDays", e.target.value.replace(/\D/g, ""))} placeholder="5" className="font-clinical" />
              </RecordsField>
            </div>
            <RecordsField label="Instructions">
              <Textarea value={form.instructions} onChange={(e) => update("instructions", e.target.value)} rows={2} placeholder="Take after meals, complete the course…" />
            </RecordsField>
            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Pill className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No treatments ordered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <FolderRecordFeedBanner>
            Expand an entry for dose, route, duration, instructions, and dispensing status.
          </FolderRecordFeedBanner>
          {list.map((t, idx) => (
            <FolderRecordExpandableRow
              key={t.id}
              railIndex={list.length - idx}
              icon={Pill}
              eyebrow="Treatment order"
              title={<span className="font-medium">{t.drug}</span>}
              preview={
                <span className="font-clinical">
                  {t.dose} · {t.route} · {t.frequency}
                  {t.durationDays ? ` · ${t.durationDays} day(s)` : ""}
                </span>
              }
              footerTime={t.prescribedAt}
              badges={<StatusPill status={t.status} />}
              headerActions={
                <Select value={t.status} onValueChange={(v) => setTreatmentStatus(t.id, v as TreatmentEntry["status"])}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="administered">Administered</SelectItem>
                    <SelectItem value="withheld">Withheld</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              }
            >
              <div className="space-y-3">
                <FolderRecordField label="Drug" value={t.drug} />
                <FolderRecordField label="Dose" value={t.dose} />
                <FolderRecordField label="Route" value={t.route} />
                <FolderRecordField label="Frequency" value={t.frequency} />
                <FolderRecordField label="Duration (days)" value={t.durationDays ? String(t.durationDays) : null} />
                <FolderRecordField label="Instructions" value={t.instructions?.trim() || null} />
                <FolderRecordField label="Ordered by" value={t.prescribedBy} />
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: TreatmentEntry["status"] }) {
  const cls =
    status === "administered"
      ? "status-pill-active"
      : status === "withheld" || status === "cancelled"
      ? "status-pill-inactive"
      : "status-pill-pending";
  return <span className={`status-pill text-xs ${cls}`}>{status}</span>;
}
