"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Baby, Loader2 } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ancService } from "@/services/anc.service";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";

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
            <p className="mt-1 text-xs text-muted-foreground">Active pregnancies with risk notes</p>
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
                    {c.pregnancyRiskNotes ? (
                      <Badge className="bg-[hsl(var(--clinical-urgent))] text-white">Flagged</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
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
  return (
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
  );
}

function RiskView({ data }: { data: import("@/types/anc.types").AncDashboardDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maternal risk</CardTitle>
        <CardDescription>
          Active ANC pregnancy episodes with non-empty risk notes appear in the dashboard count. Capture structured risk
          factors on the pregnancy record via the ANC APIs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.highRiskClients === 0 ? (
          <p className="text-sm text-muted-foreground">No high-risk clients currently flagged in the system.</p>
        ) : (
          <p className="text-sm text-foreground">
            <Badge className="bg-[hsl(var(--clinical-urgent))] text-white">{data.highRiskClients}</Badge> clients require
            follow-up once risk data is wired.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
