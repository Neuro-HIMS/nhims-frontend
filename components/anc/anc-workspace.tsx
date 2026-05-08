"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, Loader2 } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ancService } from "@/services/anc.service";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUB_NAV = [
  { label: "ANC Clients", view: "clients", href: "/anc?view=clients" },
  { label: "Follow-up Visits", view: "visits", href: "/anc?view=visits" },
  { label: "Risk Tracking", view: "risk", href: "/anc?view=risk" },
];

export function ANCWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "clients";

  const dashboard = useQuery({
    queryKey: ["anc", "dashboard"],
    queryFn: () => ancService.dashboard(),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Antenatal Care</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          ANC registration, follow-up scheduling, and maternal risk management — powered by encounter data with visit
          type ANC.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/anc" />
      <div className="pt-2">
        {dashboard.isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading ANC dashboard…
          </p>
        )}
        {dashboard.isError && (
          <p className="text-sm text-destructive">Could not load ANC dashboard. Check your permissions and try again.</p>
        )}
        {dashboard.data && (
          <>
            {view === "clients" && <ClientsView data={dashboard.data} />}
            {view === "visits" && <VisitsView data={dashboard.data} />}
            {view === "risk" && <RiskView data={dashboard.data} />}
          </>
        )}
      </div>
    </div>
  );
}

function ClientsView({ data }: { data: import("@/types/anc.types").AncDashboardDto }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="stat-card-label">Active ANC Clients</p>
            <p className="stat-card-value">{data.activeAncClients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="stat-card-label">Due This Month</p>
            <p className="stat-card-value">{data.dueThisMonth}</p>
            <p className="mt-1 text-xs text-muted-foreground">By active pregnancy EDD (record)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="stat-card-label">High Risk (flagged)</p>
            <p className="stat-card-value text-[hsl(var(--clinical-urgent))]">{data.highRiskClients}</p>
            <p className="mt-1 text-xs text-muted-foreground">Elevated automated risk or manual risk notes</p>
          </CardContent>
        </Card>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Client
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                LMP / EDD
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Risk
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Last ANC
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                ANC Visits
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No ANC encounters recorded yet.
                </td>
              </tr>
            ) : (
              data.clients.map((c) => (
                <tr key={c.patientId} className="table-row-interactive">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.patientName}</p>
                    <p className="patient-id mt-0.5">{c.patientPublicId}</p>
                  </td>
                  <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                    {c.lmp || "—"}
                    <br />
                    {c.edd ? `EDD ${c.edd}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {c.elevatedRisk ? (
                      <Badge className="bg-[hsl(var(--clinical-urgent))] text-white">
                        {c.riskLevel ?? "Flagged"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{c.riskLevel ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                    {c.lastVisitAt ? formatDateTime(c.lastVisitAt) : "—"}
                  </td>
                  <td className="px-4 py-3 font-clinical text-sm text-foreground">{c.ancVisitCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisitsView({ data }: { data: import("@/types/anc.types").AncDashboardDto }) {
  const qc = useQueryClient();
  const eligible = useMemo(() => data.clients.filter((c) => Boolean(c.activePregnancyId)), [data.clients]);
  const [pregId, setPregId] = useState<string>(eligible[0]?.activePregnancyId ?? "");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gestationWeeks, setGestationWeeks] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bp, setBp] = useState("");
  const [fundal, setFundal] = useState("");
  const [presentation, setPresentation] = useState("");
  const [fhr, setFhr] = useState("");
  const [urineProtein, setUrineProtein] = useState("");
  const [urineGlucose, setUrineGlucose] = useState("");
  const [oedema, setOedema] = useState("");
  const [notes, setNotes] = useState("");

  const visitMut = useMutation({
    mutationFn: () =>
      ancService.addVisit(pregId, {
        visitDate,
        gestationWeeks: gestationWeeks ? Number(gestationWeeks) : undefined,
        weightKg: weightKg || undefined,
        bp: bp || undefined,
        notes: notes || undefined,
        fundalHeightCm: fundal ? Number(fundal) : undefined,
        presentation: presentation || undefined,
        fhrBpm: fhr ? Number(fhr) : undefined,
        urineProtein: urineProtein || undefined,
        urineGlucose: urineGlucose || undefined,
        oedema: oedema || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["anc", "dashboard"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structured ANC visit</CardTitle>
          <CardDescription>
            Record vitals and screening fields; maternal risk is re-evaluated on save.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label>Pregnancy episode</Label>
            <Select
              value={pregId}
              onValueChange={setPregId}
              disabled={eligible.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select active pregnancy" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((c) => (
                  <SelectItem key={c.activePregnancyId!} value={c.activePregnancyId!}>
                    {c.patientName} · {c.patientPublicId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Visit date</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Gestation (weeks)</Label>
            <Input value={gestationWeeks} onChange={(e) => setGestationWeeks(e.target.value)} placeholder="e.g. 28" />
          </div>
          <div className="space-y-1">
            <Label>Weight (kg)</Label>
            <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>BP (sys/dia)</Label>
            <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" />
          </div>
          <div className="space-y-1">
            <Label>Fundal height (cm)</Label>
            <Input value={fundal} onChange={(e) => setFundal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Presentation</Label>
            <Input value={presentation} onChange={(e) => setPresentation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>FHR (bpm)</Label>
            <Input value={fhr} onChange={(e) => setFhr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Urine protein</Label>
            <Input value={urineProtein} onChange={(e) => setUrineProtein(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Urine glucose</Label>
            <Input value={urineGlucose} onChange={(e) => setUrineGlucose(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Oedema</Label>
            <Input value={oedema} onChange={(e) => setOedema(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button disabled={!pregId || visitMut.isPending} onClick={() => visitMut.mutate()}>
              {visitMut.isPending ? "Saving…" : "Save visit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Recent ANC encounters (same facility)</p>
      {data.recentVisits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent ANC visits.</p>
      ) : (
        data.recentVisits.map((v, i) => (
          <div key={`${v.patientPublicId}-${i}`} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Baby className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{v.patientName}</p>
              <p className="text-sm text-muted-foreground">
                {v.visitLabel}
                {v.clinicianName ? ` · ${v.clinicianName}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-clinical text-xs text-muted-foreground">
                {v.visitAt ? formatDateTime(v.visitAt) : "—"}
              </p>
              <span className="status-pill mt-1 text-xs capitalize">{v.encounterStatus}</span>
            </div>
          </div>
        ))
      )}
      </div>
    </div>
  );
}

function RiskView({ data }: { data: import("@/types/anc.types").AncDashboardDto }) {
  const qc = useQueryClient();
  const atRisk = useMemo(() => data.clients.filter((c) => c.elevatedRisk), [data.clients]);
  const eligible = useMemo(() => data.clients.filter((c) => Boolean(c.activePregnancyId)), [data.clients]);
  const [delPreg, setDelPreg] = useState(eligible[0]?.activePregnancyId ?? "");

  const delMut = useMutation({
    mutationFn: () => ancService.recordDelivery(delPreg, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["anc", "dashboard"] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maternal risk</CardTitle>
          <CardDescription>
            Automated rules run on each structured visit; manual risk notes still count toward this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">No elevated-risk pregnancies in the current client list.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {atRisk.map((c) => (
                <li key={c.patientId} className="rounded-md border border-border bg-card px-3 py-2">
                  <span className="font-medium text-foreground">{c.patientName}</span>{" "}
                  <Badge className="ml-2 bg-[hsl(var(--clinical-urgent))] text-white">{c.riskLevel ?? "Flagged"}</Badge>
                  {c.riskEvalSummary ? (
                    <p className="mt-1 text-xs text-muted-foreground">{c.riskEvalSummary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery &amp; PNC scheduling</CardTitle>
          <CardDescription>
            Marks the pregnancy delivered and books POSTNATAL appointments (days 1, 3, 42). Does not submit to NHIA.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[220px] flex-1 space-y-1">
            <Label>Episode</Label>
            <Select value={delPreg} onValueChange={setDelPreg} disabled={eligible.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select pregnancy" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((c) => (
                  <SelectItem key={c.activePregnancyId!} value={c.activePregnancyId!}>
                    {c.patientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!delPreg || delMut.isPending} onClick={() => delMut.mutate()}>
            {delMut.isPending ? "Recording…" : "Record delivery & schedule PNC"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
