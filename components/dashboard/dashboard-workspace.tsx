"use client";

import { useSearchParams } from "next/navigation";
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
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="OPD Attendance Today"
          value="142"
          delta="+12 vs yesterday"
          icon={<Users className="h-5 w-5" />}
          trend="up"
        />
        <StatCard
          label="Inpatient Admissions"
          value="38"
          delta="3 pending discharge"
          icon={<BedDouble className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Lab Tests"
          value="27"
          delta="4 critical priority"
          icon={<FlaskConical className="h-5 w-5" />}
          alert
        />
        <StatCard
          label="Pharmacy Queue"
          value="19"
          delta="Avg. wait 14 min"
          icon={<Pill className="h-5 w-5" />}
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Activity</CardTitle>
            <CardDescription>Registrations and visits since midnight</CardDescription>
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
            <CardDescription>Patient distribution across departments</CardDescription>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly DHIMS2 Indicators</CardTitle>
          <CardDescription>Key performance indicators — May 2026</CardDescription>
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
