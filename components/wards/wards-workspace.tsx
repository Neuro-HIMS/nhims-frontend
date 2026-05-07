"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { ipdService } from "@/services/ipd.service";
import { queryKeys } from "@/lib/query-keys";

const SUB_NAV = [
  { label: "Bed Board", view: "beds", href: "/wards?view=beds" },
  { label: "Admissions", view: "admissions", href: "/wards?view=admissions" },
  { label: "Discharge", view: "discharge", href: "/wards?view=discharge" },
];

const DISCHARGE_OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "IMPROVED", label: "Improved" },
  { value: "STABLE", label: "Stable" },
  { value: "AMA", label: "Left against medical advice" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DECEASED", label: "Deceased" },
  { value: "OTHER", label: "Other" },
];

export function WardsWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "beds";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ward Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Bed occupancy from the IPD catalogue and active admissions from clinical records.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/wards" />
      <div className="pt-2">
        {view === "beds" && <BedBoardView />}
        {view === "admissions" && <AdmissionsView />}
        {view === "discharge" && <DischargeView />}
      </div>
    </div>
  );
}

function BedBoardView() {
  const board = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.board(),
    staleTime: 30_000,
  });

  const nursing = useQuery({
    queryKey: [...queryKeys.ipd.wards, "nursing"],
    queryFn: () => ipdService.nursingOverview(),
    staleTime: 120_000,
  });

  if (board.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading bed board…
      </p>
    );
  }
  if (board.isError || !board.data) {
    return <p className="text-sm text-destructive">Could not load ward board.</p>;
  }

  const wards = board.data.wards;

  return (
    <div className="space-y-6">
      {nursing.data?.notice && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inpatient nursing (MAR / TPR)</CardTitle>
            <CardDescription className="text-xs">{nursing.data.notice}</CardDescription>
          </CardHeader>
        </Card>
      )}
      {wards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No wards configured for this facility.
          </CardContent>
        </Card>
      ) : (
        wards.map((ward) => (
          <div key={ward.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">{ward.name}</h2>
              <span className="text-sm text-muted-foreground">
                {ward.beds.filter((b) => b.occupied).length}/{ward.beds.length} occupied
              </span>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
              {ward.beds.map((bed) => (
                <div
                  key={bed.id}
                  className={`rounded-lg border p-3 text-center text-sm ${
                    bed.occupied
                      ? "border-[hsl(var(--clinical-semi-urgent))] bg-[hsl(var(--clinical-semi-urgent-bg))]"
                      : "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))]"
                  }`}
                >
                  <BedDouble
                    className={`mx-auto mb-1 h-5 w-5 ${
                      bed.occupied ? "text-[hsl(var(--clinical-semi-urgent))]" : "text-[hsl(var(--clinical-routine))]"
                    }`}
                  />
                  <p className="font-semibold text-foreground">{bed.label}</p>
                  {bed.occupied ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{bed.patientName || bed.patientPublicId}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[hsl(var(--clinical-routine))]">Available</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AdmissionsView() {
  const admissions = useQuery({
    queryKey: ["clinical", "admissions", "active"],
    queryFn: () => clinicalService.activeAdmissions(),
    staleTime: 30_000,
  });

  if (admissions.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading admissions…
      </p>
    );
  }

  const rows = admissions.data ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Patient
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ward / Bed
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admitted
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Reason
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Clinician
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No active inpatient admissions.
              </td>
            </tr>
          ) : (
            rows.map((a) => (
              <tr key={a.id} className="table-row-interactive">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{a.patientName}</p>
                  <p className="patient-id mt-0.5">{a.patientPublicId}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {a.ward} · {a.bed}
                </td>
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                  {a.admittedAt ? formatDateTime(a.admittedAt) : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{a.reason || "—"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.admittedByName}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DischargeView() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [icd11Codes, setIcd11Codes] = useState("");
  const [dischargeMedicationSummary, setDischargeMedicationSummary] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");

  const admissions = useQuery({
    queryKey: ["clinical", "admissions", "active"],
    queryFn: () => clinicalService.activeAdmissions(),
    staleTime: 15_000,
  });

  const dischargeMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        summary: string;
        outcome?: string;
        icd11Codes?: string;
        dischargeMedicationSummary?: string;
        followUpPlan?: string;
      };
    }) => clinicalService.discharge(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clinical", "admissions", "active"] });
      void qc.invalidateQueries({ queryKey: queryKeys.ipd.wards });
      toast.success("Patient discharged");
      setOpenId(null);
      setSummary("");
      setOutcome("");
      setIcd11Codes("");
      setDischargeMedicationSummary("");
      setFollowUpPlan("");
    },
    onError: () => toast.error("Could not discharge"),
  });

  const rows = admissions.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active admissions</CardTitle>
          <CardDescription>Select a patient to record discharge summary — bed occupancy updates automatically.</CardDescription>
        </CardHeader>
      </Card>

      {admissions.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Nothing to discharge.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{a.patientName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.ward} · {a.bed} · admitted {a.admittedAt ? formatDateTime(a.admittedAt) : "—"}
                </p>
              </div>
              <Badge variant="outline">{a.reason ? "Reason recorded" : "IPD"}</Badge>
              <Button size="sm" variant="outline" onClick={() => { setOpenId(a.id); setSummary(""); setOutcome(""); setIcd11Codes(""); setDischargeMedicationSummary(""); setFollowUpPlan(""); }}>
                Discharge
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openId !== null} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discharge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Clinical discharge summary</Label>
              <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Course in hospital, key investigations, condition at discharge…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Outcome</Label>
              <Select value={outcome || "__none__"} onValueChange={(v) => setOutcome(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  {DISCHARGE_OUTCOME_OPTIONS.map((o) => (
                    <SelectItem key={o.value || "none"} value={o.value || "__none__"}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ICD-11 discharge diagnoses (comma-separated)</Label>
              <Input value={icd11Codes} onChange={(e) => setIcd11Codes(e.target.value)} placeholder="e.g. 1A00, 5A11" className="font-clinical" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Medications on discharge</Label>
              <Textarea rows={2} value={dischargeMedicationSummary} onChange={(e) => setDischargeMedicationSummary(e.target.value)} placeholder="Drug, dose, duration…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Follow-up plan</Label>
              <Textarea rows={2} value={followUpPlan} onChange={(e) => setFollowUpPlan(e.target.value)} placeholder="OPD review date, referrals, warnings…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)}>
              Cancel
            </Button>
            <Button
              disabled={!summary.trim() || dischargeMut.isPending || !openId}
              onClick={() =>
                openId &&
                dischargeMut.mutate({
                  id: openId,
                  payload: {
                    summary: summary.trim(),
                    outcome: outcome.trim() || undefined,
                    icd11Codes: icd11Codes.trim() || undefined,
                    dischargeMedicationSummary: dischargeMedicationSummary.trim() || undefined,
                    followUpPlan: followUpPlan.trim() || undefined,
                  },
                })
              }
            >
              {dischargeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm discharge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
