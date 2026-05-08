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
  { label: "MAR / TPR", view: "nursing", href: "/wards?view=nursing" },
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
        {view === "nursing" && <WardsNursingMarTprView />}
        {view === "discharge" && <DischargeView />}
      </div>
    </div>
  );
}

function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function WardsNursingMarTprView() {
  const qc = useQueryClient();
  const admissions = useQuery({
    queryKey: ["clinical", "admissions", "active"],
    queryFn: () => clinicalService.activeAdmissions(),
    staleTime: 20_000,
  });

  const [admissionId, setAdmissionId] = useState<string | null>(null);
  const [marSchedule, setMarSchedule] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [marDrug, setMarDrug] = useState("");
  const [marDose, setMarDose] = useState("");
  const [marRoute, setMarRoute] = useState("");

  const [tprAt, setTprAt] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [tempC, setTempC] = useState("");
  const [pulse, setPulse] = useState("");
  const [respRate, setRespRate] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [tprNotes, setTprNotes] = useState("");

  const marList = useQuery({
    queryKey: ["ipd", "mar", admissionId],
    queryFn: () => ipdService.listMar(admissionId!),
    enabled: Boolean(admissionId),
  });

  const tprList = useQuery({
    queryKey: ["ipd", "tpr", admissionId],
    queryFn: () => ipdService.listTpr(admissionId!),
    enabled: Boolean(admissionId),
  });

  const addMarMut = useMutation({
    mutationFn: () =>
      ipdService.addMar(admissionId!, {
        scheduledFor: localToIso(marSchedule),
        drugDisplay: marDrug.trim(),
        dose: marDose.trim() || undefined,
        route: marRoute.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ipd", "mar", admissionId] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.ipd.wards, "nursing"] });
      toast.success("MAR entry saved");
      setMarDrug("");
      setMarDose("");
      setMarRoute("");
    },
    onError: () => toast.error("Could not save MAR entry"),
  });

  const addTprMut = useMutation({
    mutationFn: () =>
      ipdService.addTpr(admissionId!, {
        recordedAt: localToIso(tprAt),
        tempC: tempC.trim() || undefined,
        pulse: pulse.trim() || undefined,
        respRate: respRate.trim() || undefined,
        bpSys: bpSys.trim() || undefined,
        bpDia: bpDia.trim() || undefined,
        notes: tprNotes.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ipd", "tpr", admissionId] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.ipd.wards, "nursing"] });
      toast.success("TPR recorded");
      setTempC("");
      setPulse("");
      setRespRate("");
      setBpSys("");
      setBpDia("");
      setTprNotes("");
    },
    onError: () => toast.error("Could not record TPR"),
  });

  const rows = admissions.data ?? [];

  if (admissions.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading admissions…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Select admission</CardTitle>
          <CardDescription>Charts are scoped to one active inpatient admission.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active admissions — admit a patient first.</p>
          ) : (
            <Select
              value={admissionId ?? "__pick__"}
              onValueChange={(v) => setAdmissionId(v === "__pick__" ? null : v)}
            >
              <SelectTrigger className="max-w-xl">
                <SelectValue placeholder="Choose patient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__pick__">Choose…</SelectItem>
                {rows.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.patientName} · {a.ward} / {a.bed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {!admissionId ? null : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Medication administration (MAR)</CardTitle>
              <CardDescription>Entries from /api/ipd/nursing/admissions/{`{id}`}/mar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Scheduled for</Label>
                  <Input
                    type="datetime-local"
                    value={marSchedule}
                    onChange={(e) => setMarSchedule(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Drug / order label *</Label>
                  <Input value={marDrug} onChange={(e) => setMarDrug(e.target.value)} placeholder="e.g. Ceftriaxone IV" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dose</Label>
                  <Input value={marDose} onChange={(e) => setMarDose(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Route</Label>
                  <Input value={marRoute} onChange={(e) => setMarRoute(e.target.value)} />
                </div>
              </div>
              <Button
                size="sm"
                disabled={!marDrug.trim() || addMarMut.isPending}
                onClick={() => addMarMut.mutate()}
              >
                {addMarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add MAR row"}
              </Button>

              <div className="max-h-64 overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Scheduled</th>
                      <th className="px-2 py-1.5 text-left font-medium">Drug</th>
                      <th className="px-2 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(marList.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-muted-foreground">
                          No MAR rows.
                        </td>
                      </tr>
                    ) : (
                      (marList.data ?? []).map((m) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="px-2 py-1.5 font-clinical text-muted-foreground">
                            {m.scheduledFor ? formatDateTime(m.scheduledFor) : "—"}
                          </td>
                          <td className="px-2 py-1.5">{m.drugDisplay}</td>
                          <td className="px-2 py-1.5">{m.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Temperature–pulse–respiration (TPR)</CardTitle>
              <CardDescription>Vitals series from /api/ipd/nursing/admissions/{`{id}`}/tpr</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Recorded at</Label>
                  <Input
                    type="datetime-local"
                    value={tprAt}
                    onChange={(e) => setTprAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temp °C</Label>
                  <Input value={tempC} onChange={(e) => setTempC(e.target.value)} className="font-clinical" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pulse</Label>
                  <Input value={pulse} onChange={(e) => setPulse(e.target.value)} className="font-clinical" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Resp. rate</Label>
                  <Input value={respRate} onChange={(e) => setRespRate(e.target.value)} className="font-clinical" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BP systolic</Label>
                  <Input value={bpSys} onChange={(e) => setBpSys(e.target.value)} className="font-clinical" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BP diastolic</Label>
                  <Input value={bpDia} onChange={(e) => setBpDia(e.target.value)} className="font-clinical" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={tprNotes} onChange={(e) => setTprNotes(e.target.value)} />
                </div>
              </div>
              <Button size="sm" disabled={addTprMut.isPending} onClick={() => addTprMut.mutate()}>
                {addTprMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record TPR"}
              </Button>

              <div className="max-h-64 overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Time</th>
                      <th className="px-2 py-1.5 text-left font-medium">T / P / R</th>
                      <th className="px-2 py-1.5 text-left font-medium">BP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tprList.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-muted-foreground">
                          No TPR readings.
                        </td>
                      </tr>
                    ) : (
                      (tprList.data ?? []).map((t) => (
                        <tr key={t.id} className="border-t border-border">
                          <td className="px-2 py-1.5 font-clinical text-muted-foreground">
                            {t.recordedAt ? formatDateTime(t.recordedAt) : "—"}
                          </td>
                          <td className="px-2 py-1.5 font-clinical">
                            {[t.tempC, t.pulse, t.respRate].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td className="px-2 py-1.5 font-clinical">
                            {t.bpSys && t.bpDia ? `${t.bpSys}/${t.bpDia}` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
