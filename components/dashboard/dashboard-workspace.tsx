"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  Users,
  BedDouble,
  FlaskConical,
  Pill,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

const SUB_NAV = [
  { label: "Overview", view: "overview", href: "/dashboard?view=overview" },
  { label: "Key Indicators", view: "indicators", href: "/dashboard?view=indicators" },
  { label: "Alerts", view: "alerts", href: "/dashboard?view=alerts" },
];

export function DashboardWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "overview";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Facility-wide overview and performance indicators.
          </p>
        </div>
      </div>

      <ModuleSubNav items={SUB_NAV} basePath="/dashboard" />

      <div className="pt-2">
        {view === "overview" && <OverviewView />}
        {view === "indicators" && <IndicatorsView />}
        {view === "alerts" && <AlertsView />}
      </div>
    </div>
  );
}

function OverviewView() {
  const todayEncountersQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: 60_000,
  });
  const labReadyQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "READY", "dashboard"],
    queryFn: () => clinicalService.labWorklist("READY"),
    refetchInterval: 60_000,
  });
  const pharmacyQueueQuery = useQuery({
    queryKey: [...queryKeys.clinical.pharmacyQueue, "dashboard-open"],
    queryFn: async () => {
      const rows = await clinicalService.pharmacyWorklist(undefined);
      return rows.filter((p) =>
        ["ORDERED", "AWAITING_PAYMENT", "READY", "PARTIALLY_DISPENSED"].includes(p.status),
      );
    },
    refetchInterval: 60_000,
  });

  const encounters = todayEncountersQuery.data ?? [];
  const clinicalTodayTouchpoints = encounters.filter(
    (e) => !["CANCELLED", "NO_SHOW"].includes(e.status),
  ).length;

  const liveValue = (q: UseQueryResult<unknown>, n: number) =>
    q.isLoading ? "…" : q.isError ? "—" : String(n);

  return (
    <div className="space-y-6">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Live clinical board</p>
          <p className="mt-1">
            The first row below uses today&apos;s encounters and worklists from{" "}
            <code className="rounded bg-muted px-1 text-xs">/clinical</code>. Open the{" "}
            <Link href="/nurse?view=visits" className="font-medium text-primary underline-offset-4 hover:underline">
              Nurse queue
            </Link>
            ,{" "}
            <Link href="/opd?view=queue" className="font-medium text-primary underline-offset-4 hover:underline">
              OPD consult
            </Link>
            ,{" "}
            <Link href="/laboratory" className="font-medium text-primary underline-offset-4 hover:underline">
              Laboratory
            </Link>
            , or{" "}
            <Link href="/pharmacy" className="font-medium text-primary underline-offset-4 hover:underline">
              Pharmacy
            </Link>{" "}
            for the full workflow. Official DHIMS2 submissions live under{" "}
            <Link href="/reports?view=dhims2" className="font-medium text-primary underline-offset-4 hover:underline">
              Reports
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clinical encounters (today)"
          value={liveValue(todayEncountersQuery, clinicalTodayTouchpoints)}
          delta="Live • excludes cancelled / no-show"
          icon={<Users className="h-5 w-5" />}
          trend={todayEncountersQuery.isSuccess && clinicalTodayTouchpoints > 0 ? "up" : undefined}
        />
        <StatCard
          label="Inpatient snapshot"
          value="38"
          delta="Illustrative aggregate — wards summary API not wired here"
          icon={<BedDouble className="h-5 w-5" />}
        />
        <StatCard
          label="Lab READY worklist"
          value={liveValue(labReadyQuery, labReadyQuery.data?.length ?? 0)}
          delta="Orders on lab queue (bill line may still be open)"
          icon={<FlaskConical className="h-5 w-5" />}
          alert={labReadyQuery.isSuccess && (labReadyQuery.data?.length ?? 0) > 0}
        />
        <StatCard
          label="Pharmacy pipeline"
          value={liveValue(pharmacyQueueQuery, pharmacyQueueQuery.data?.length ?? 0)}
          delta="Open Rx: ordered → partially dispensed"
          icon={<Pill className="h-5 w-5" />}
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Activity</CardTitle>
            <CardDescription>
              Synthetic sample timeline for layout — replace with audit stream when available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {RECENT_ACTIVITY.map((item, i) => (
                  <tr key={i} className="table-row-interactive">
                    <td className="py-2.5 font-clinical text-xs text-muted-foreground">{item.time}</td>
                    <td className="py-2.5 text-foreground">{item.event}</td>
                    <td className="py-2.5">
                      <span className="facility-chip rounded px-1.5 py-0.5 text-xs">{item.module}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Load</CardTitle>
            <CardDescription>
              Demonstration percentages — not wired to live capacity APIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEPT_LOAD.map((dept) => (
                <div key={dept.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{dept.name}</span>
                    <span className="font-clinical text-xs text-muted-foreground">
                      {dept.current}/{dept.capacity}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((dept.current / dept.capacity) * 100)}%`,
                        background: dept.current / dept.capacity > 0.85
                          ? "hsl(var(--clinical-urgent))"
                          : "hsl(var(--accent))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IndicatorsView() {
  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          These KPI rows are placeholders for dashboards fed by NHIMS reporting. Submit and review official DHIMS2
          returns in{" "}
          <Link href="/reports?view=dhims2" className="font-medium text-primary underline-offset-4 hover:underline">
            Reports → DHIMS2
          </Link>
          .
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly DHIMS2 Indicators</CardTitle>
          <CardDescription>Sample KPI table — May 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Indicator</th>
                <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Target</th>
                <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actual</th>
                <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {INDICATORS.map((row) => (
                <tr key={row.name} className="table-row-interactive">
                  <td className="py-2.5 font-medium text-foreground">{row.name}</td>
                  <td className="py-2.5 text-right font-clinical text-muted-foreground">{row.target}</td>
                  <td className="py-2.5 text-right font-clinical text-foreground">{row.actual}</td>
                  <td className="py-2.5 text-right">
                    <span className={`status-pill ${row.met ? "status-pill-active" : "status-pill-pending"}`}>
                      {row.met ? "On track" : "Review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertsView() {
  return (
    <div className="space-y-3">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          Alerts below illustrate triage-style messaging. Operational alerting will replace this mock list when wired to
          clinical rules.
        </CardContent>
      </Card>
      {ALERTS.map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            alert.level === "critical"
              ? "alert-critical border"
              : alert.level === "warning"
              ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))]"
              : "notice-info border"
          }`}
        >
          {alert.level === "critical" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--clinical-emergency))]" />
          ) : alert.level === "warning" ? (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--clinical-urgent))]" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{alert.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{alert.detail}</p>
          </div>
          <Badge variant={alert.level === "critical" ? "destructive" : "outline"} className="shrink-0 text-xs">
            {alert.module}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon,
  trend,
  alert,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="stat-card-label">{label}</p>
            <p className="stat-card-value">{value}</p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              alert ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]" : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-[hsl(var(--nhis-active))]" />}
          {trend === "down" && <Activity className="h-3 w-3 text-[hsl(var(--clinical-urgent))]" />}
          {delta}
        </p>
      </CardContent>
    </Card>
  );
}

const RECENT_ACTIVITY = [
  { time: "09:47", event: "New patient registered — Kofi Acheampong", module: "Records" },
  { time: "09:31", event: "Lab result reported — Malaria RDT positive", module: "Lab" },
  { time: "09:18", event: "Prescription dispensed — Amoxicillin 500mg", module: "Pharmacy" },
  { time: "09:04", event: "Patient admitted — Ward B Bed 14", module: "Wards" },
  { time: "08:52", event: "Triage completed — Priority 2 (Urgent)", module: "Nurse" },
  { time: "08:40", event: "NHIS eligibility verified — Active", module: "Billing" },
];

const DEPT_LOAD = [
  { name: "OPD", current: 142, capacity: 200 },
  { name: "Ward A (General)", current: 28, capacity: 30 },
  { name: "Ward B (Maternity)", current: 22, capacity: 25 },
  { name: "ICU", current: 8, capacity: 10 },
  { name: "Laboratory", current: 27, capacity: 60 },
];

const INDICATORS = [
  { name: "ANC 1st Visit Coverage", target: "90%", actual: "88%", met: true },
  { name: "Deliveries at Facility", target: "120", actual: "98", met: false },
  { name: "OPD Malaria Cases", target: "—", actual: "214", met: true },
  { name: "Under-5 Outpatient Visits", target: "300", actual: "312", met: true },
  { name: "Family Planning Acceptors", target: "80", actual: "67", met: false },
];

const ALERTS = [
  {
    level: "critical",
    title: "Critical lab result pending review",
    detail: "Patient GH-2026-04821 — Glucose 32 mmol/L. Awaiting clinician sign-off.",
    module: "Laboratory",
  },
  {
    level: "warning",
    title: "Ward B approaching capacity",
    detail: "22 of 25 beds occupied. Consider early discharge review for stable patients.",
    module: "Wards",
  },
  {
    level: "warning",
    title: "Drug stock low — Artemether 20mg",
    detail: "Current stock: 48 tablets. Reorder threshold: 100 tablets.",
    module: "Pharmacy",
  },
  {
    level: "info",
    title: "DHIMS2 monthly report due in 3 days",
    detail: "May 2026 report submission window closes on 2026-06-05.",
    module: "Reports",
  },
];
