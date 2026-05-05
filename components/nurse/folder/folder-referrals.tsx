"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { useEncountersStore } from "@/store/encounters.store";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { Referral, Visit } from "@/lib/clinical-types";

const DEPARTMENTS = [
  "General OPD",
  "Family Medicine",
  "Pediatrics",
  "Maternity",
  "Surgery",
  "Internal Medicine",
  "Emergency",
  "Laboratory",
  "Radiology",
  "Pharmacy",
];

const EMPTY_REF = {
  fromDepartment: "Nurse Station",
  toDepartment: "General OPD",
  reason: "",
  urgency: "routine" as Referral["urgency"],
};

interface FolderReferralsProps {
  patientId: string;
  visit: Visit | null;
  user: string;
}

export function FolderReferrals({ patientId, visit, user }: FolderReferralsProps) {
  const referrals = useEncountersStore((s) => s.referrals);
  const addReferral = useEncountersStore((s) => s.addReferral);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_REF);

  const list = useMemo(
    () => referrals.filter((r) => r.patientId === patientId).sort((a, b) => b.referredAt.localeCompare(a.referredAt)),
    [referrals, patientId]
  );

  function handleSave() {
    if (!visit) {
      toast.error("Open the patient via a visit before referring");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Reason for referral is required");
      return;
    }
    addReferral({
      visitId: visit.id,
      patientId,
      fromDepartment: form.fromDepartment,
      toDepartment: form.toDepartment,
      reason: form.reason.trim(),
      urgency: form.urgency,
      referredBy: user,
    });
    toast.success(`Referred to ${form.toDepartment}`);
    setForm(EMPTY_REF);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Internal Referrals</p>
          <p className="text-xs text-muted-foreground">{list.length} referral{list.length === 1 ? "" : "s"}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={!visit}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Refer Patient"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Internal Referral</CardTitle>
            <CardDescription>The receiving department will see this patient in their queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RecordsField label="From">
                <Select value={form.fromDepartment} onValueChange={(v) => setForm({ ...form, fromDepartment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Nurse Station", ...DEPARTMENTS].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="To *">
                <Select value={form.toDepartment} onValueChange={(v) => setForm({ ...form, toDepartment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Urgency">
                <Select value={form.urgency} onValueChange={(v: Referral["urgency"]) => setForm({ ...form, urgency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
            </div>
            <RecordsField label="Reason *">
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
            </RecordsField>
            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Send Referral
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ArrowRightLeft className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No referrals on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {r.fromDepartment} <ArrowRightLeft className="inline h-3.5 w-3.5 text-muted-foreground" /> {r.toDepartment}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(r.referredAt)} · {r.referredBy}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`status-pill text-xs ${
                    r.urgency === "stat"
                      ? "bg-[hsl(var(--clinical-emergency))] text-white"
                      : r.urgency === "urgent"
                      ? "bg-[hsl(var(--clinical-urgent))] text-white"
                      : "status-pill-pending"
                  }`}>{r.urgency.toUpperCase()}</span>
                  <span className="status-pill status-pill-pending text-xs">{r.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
