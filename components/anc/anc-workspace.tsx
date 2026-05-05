"use client";

import { useSearchParams } from "next/navigation";
import { Baby } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SUB_NAV = [
  { label: "ANC Clients", view: "clients", href: "/anc?view=clients" },
  { label: "Follow-up Visits", view: "visits", href: "/anc?view=visits" },
  { label: "Risk Tracking", view: "risk", href: "/anc?view=risk" },
];

export function ANCWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "clients";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Antenatal Care</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          ANC registration, follow-up scheduling, and maternal risk management.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/anc" />
      <div className="pt-2">
        {view === "clients" && <ClientsView />}
        {view === "visits" && <VisitsView />}
        {view === "risk" && <RiskView />}
      </div>
    </div>
  );
}

function ClientsView() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="stat-card-label">Active ANC Clients</p><p className="stat-card-value">38</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="stat-card-label">Due This Month</p><p className="stat-card-value">7</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="stat-card-label">High Risk</p><p className="stat-card-value text-[hsl(var(--clinical-urgent))]">4</p></CardContent></Card>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Gestation</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">EDD</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">ANC Visits</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ANC_CLIENTS.map((c) => (
              <tr key={c.id} className="table-row-interactive">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="patient-id mt-0.5">{c.patientId}</p>
                </td>
                <td className="px-4 py-3 font-clinical text-sm text-foreground">{c.gestationWeeks} wks</td>
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">{c.edd}</td>
                <td className="px-4 py-3 font-clinical text-sm text-foreground">{c.visits}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill text-xs ${c.risk==="high"?"bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]":c.risk==="medium"?"status-pill-pending":"status-pill-active"}`}>
                    {c.risk.charAt(0).toUpperCase()+c.risk.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisitsView() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Upcoming and recent ANC follow-up visits</p>
      {ANC_VISITS.map((v, i) => (
        <div key={i} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Baby className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{v.client}</p>
            <p className="text-sm text-muted-foreground">{v.visitType} · {v.clinician}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-clinical text-xs text-muted-foreground">{v.date}</p>
            <span className={`mt-1 status-pill text-xs ${v.status==="upcoming"?"status-pill-pending":"status-pill-active"}`}>
              {v.status==="upcoming"?"Upcoming":"Completed"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskView() {
  const highRisk = ANC_CLIENTS.filter((c) => c.risk === "high");
  return (
    <div className="space-y-3">
      {highRisk.length === 0 ? (
        <p className="text-sm text-muted-foreground">No high-risk clients currently flagged.</p>
      ) : (
        highRisk.map((c) => (
          <div key={c.id} className="rounded-lg border-2 border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{c.name}</p>
                <p className="patient-id mt-0.5">{c.patientId}</p>
              </div>
              <Badge className="bg-[hsl(var(--clinical-urgent))] text-white">High Risk</Badge>
            </div>
            <p className="mt-2 text-sm text-foreground">{c.riskFactors}</p>
          </div>
        ))
      )}
    </div>
  );
}

const ANC_CLIENTS = [
  { id:"anc1", name:"Abena Osei", patientId:"GH-2026-03109", gestationWeeks:28, edd:"2026-07-28", visits:3, risk:"low", riskFactors:"" },
  { id:"anc2", name:"Grace Amponsah", patientId:"GH-2026-04100", gestationWeeks:34, edd:"2026-06-14", visits:5, risk:"high", riskFactors:"Pre-eclampsia, gestational diabetes, previous still birth" },
  { id:"anc3", name:"Diana Amoah", patientId:"GH-2026-02890", gestationWeeks:20, edd:"2026-09-03", visits:2, risk:"medium", riskFactors:"Anaemia detected at ANC 2" },
  { id:"anc4", name:"Florence Ankrah", patientId:"GH-2026-05600", gestationWeeks:38, edd:"2026-05-24", visits:7, risk:"low", riskFactors:"" },
];

const ANC_VISITS = [
  { client:"Florence Ankrah", visitType:"ANC 8th Visit", clinician:"Midwife Adwoa", date:"2026-05-05", status:"upcoming" },
  { client:"Abena Osei", visitType:"ANC 4th Visit", clinician:"Midwife Adwoa", date:"2026-05-12", status:"upcoming" },
  { client:"Grace Amponsah", visitType:"ANC 6th Visit — Specialist Review", clinician:"Dr. Boateng", date:"2026-05-08", status:"upcoming" },
  { client:"Abena Osei", visitType:"ANC 3rd Visit", clinician:"Midwife Adwoa", date:"2026-05-01", status:"completed" },
];
