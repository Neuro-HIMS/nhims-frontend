"use client";

import { useMemo } from "react";
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
import { ipdService } from "@/services/ipd.service";
import { formatEncounterStation } from "@/components/clinical/lib/station-labels";
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
  const boardQuery = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.board(),
    refetchInterval: 120_000,
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

  const occupiedBeds =
    boardQuery.data?.wards.reduce((n, w) => n + w.beds.filter((b) => b.occupied).length, 0) ?? 0;
  const totalBeds = boardQuery.data?.wards.reduce((n, w) => n + w.beds.length, 0) ?? 0;

  const activityRows = useMemo(() => {
    return [...encounters]
      .filter((e) => !["CANCELLED", "NO_SHOW"].includes(e.status))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 12)
      .map((e) => ({
        time: shortTimeLabel(e.updatedAt),
        event: `${e.patientPublicId} · ${e.status} · ${formatEncounterStation(e.currentStation)}`,
        module: e.department?.trim() ? e.department : "Clinical",
      }));
  }, [encounters]);

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
          label="Occupied beds (catalogue)"
          value={
            boardQuery.isLoading ? "…" : boardQuery.isError ? "—" : `${occupiedBeds}/${totalBeds || 0}`
          }
          delta="Live • from IPD ward board"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s clinical touches (recent updates)</CardTitle>
          <CardDescription>
            Derived from today&apos;s encounter list — not a full audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No encounter updates yet today.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Time
                  </th>
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Encounter snapshot
                  </th>
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Dept
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activityRows.map((item, i) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IndicatorsView() {
  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 text-sm text-muted-foreground">
          Programme indicators and DHIMS2 submission depth are tracked under{" "}
          <Link href="/reports?view=dhims2" className="font-medium text-primary underline-offset-4 hover:underline">
            Reports → DHIMS2
          </Link>
          . This dashboard tab no longer shows sample KPI rows.
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

function shortTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}
