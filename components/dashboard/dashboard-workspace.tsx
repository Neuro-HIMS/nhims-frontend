"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  Users,
  BedDouble,
  FlaskConical,
  Pill,
  TrendingUp,
  AlertTriangle,
  Activity,
} from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { toast } from "sonner";

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
  const labCriticalQuery = useQuery({
    queryKey: queryKeys.clinical.labCriticalInbox,
    queryFn: () => clinicalService.labCriticalAlertsInbox(),
    refetchInterval: 30_000,
  });

  const encounters = todayEncountersQuery.data ?? [];
  const clinicalTodayTouchpoints = encounters.filter(
    (e) => !["CANCELLED", "NO_SHOW"].includes(e.status),
  ).length;

  const liveValue = (q: UseQueryResult<unknown>, n: number) =>
    q.isLoading ? "…" : q.isError ? "—" : String(n);

  const criticalLab = labCriticalQuery.data ?? [];

  return (
    <div className="space-y-6">
      {criticalLab.length > 0 && (
        <Card className="border-[hsl(var(--clinical-emergency))] bg-[hsl(var(--clinical-emergency-bg))]">
          <CardContent className="flex flex-wrap items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--clinical-emergency))]" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium text-foreground">
                {criticalLab.length} critical lab result{criticalLab.length === 1 ? "" : "s"} need acknowledgement
              </p>
              <p className="text-sm text-muted-foreground">
                Open the Alerts tab to review patients, orders, and confirm each critical value.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 border-[hsl(var(--clinical-emergency))]" asChild>
              <Link href="/dashboard?view=alerts">Open alerts</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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

      {/* Sample-only widgets — not fed by live APIs (see card descriptions). */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s activity (sample)</CardTitle>
            <CardDescription>
              Illustrative timeline for layout — not live audit data
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
                {SAMPLE_RECENT_ACTIVITY.map((item, i) => (
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
            <CardTitle className="text-base">Department load (sample)</CardTitle>
            <CardDescription>
              Illustrative occupancy — not wired to live capacity APIs
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
          <CardTitle className="text-base">Monthly DHIMS2 indicators (sample)</CardTitle>
          <CardDescription>Illustrative KPI rows — May 2026</CardDescription>
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
              {SAMPLE_DHIMS_INDICATORS.map((row) => (
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
  const qc = useQueryClient();
  const inboxQuery = useQuery({
    queryKey: queryKeys.clinical.labCriticalInbox,
    queryFn: () => clinicalService.labCriticalAlertsInbox(),
    refetchInterval: 30_000,
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => clinicalService.acknowledgeLabCriticalAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.labCriticalInbox });
      toast.success("Critical lab alert acknowledged");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Could not acknowledge");
    },
  });

  const rows = inboxQuery.data ?? [];

  return (
    <div className="space-y-3">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Critical laboratory values</p>
          <p className="mt-1">
            When a result row is flagged CRITICAL, the ordering clinician (or facility oversight roles) must acknowledge
            review here. Other operational alerts remain on the roadmap.
          </p>
        </CardContent>
      </Card>
      {inboxQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading critical alerts…</p>
      )}
      {inboxQuery.isError && (
        <p className="text-sm text-destructive">You may not have access to this inbox, or the request failed.</p>
      )}
      {!inboxQuery.isLoading && !inboxQuery.isError && rows.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No open critical lab alerts.</CardContent>
        </Card>
      )}
      {rows.map((alert) => (
        <div
          key={alert.id}
          className="flex flex-wrap items-start gap-3 rounded-lg border border-[hsl(var(--clinical-emergency))] bg-[hsl(var(--clinical-emergency-bg))] p-4"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--clinical-emergency))]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {alert.patientPublicId} · {alert.serviceName}
            </p>
            <p className="mt-0.5 font-clinical text-sm text-muted-foreground">{alert.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Order {alert.labOrderId.slice(0, 8)}… ·{" "}
              <Link
                href={`/nurse?view=folder&patientId=${alert.patientId}&visitId=${alert.encounterId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Open encounter folder
              </Link>
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={ackMut.isPending}
            onClick={() => ackMut.mutate(alert.id)}
            className="shrink-0"
          >
            Acknowledge
          </Button>
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

const SAMPLE_RECENT_ACTIVITY = [
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

const SAMPLE_DHIMS_INDICATORS = [
  { name: "ANC 1st Visit Coverage", target: "90%", actual: "88%", met: true },
  { name: "Deliveries at Facility", target: "120", actual: "98", met: false },
  { name: "OPD Malaria Cases", target: "—", actual: "214", met: true },
  { name: "Under-5 Outpatient Visits", target: "300", actual: "312", met: true },
  { name: "Family Planning Acceptors", target: "80", actual: "67", met: false },
];
