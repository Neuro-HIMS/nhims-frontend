"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { reportsService } from "@/services/reports.service";

const STATIC_FALLBACK_TABS = [
  { label: "DHIMS2 Summary", category: "DHIMS2", routePath: "/reports?view=dhims2", viewKey: "dhims2" },
  { label: "Monthly Report", category: "Facility", routePath: "/reports?view=monthly", viewKey: "monthly" },
  { label: "Exports", category: "Exports", routePath: "/reports?view=exports", viewKey: "exports" },
] as const;

export function ReportsWorkspace() {
  const searchParams = useSearchParams();

  const defsQuery = useQuery({
    queryKey: queryKeys.reporting.definitions,
    queryFn: () => reportsService.listDefinitions(),
    staleTime: 120_000,
  });

  const tabs = useMemo(() => {
    const rows = defsQuery.data ?? [];
    if (rows.length > 0) {
      return rows.map((r) => ({
        label: r.title,
        href: r.routePath.startsWith("/") ? r.routePath : `/${r.routePath}`,
        viewKey: parseShellView(r.routePath),
        category: r.category,
      }));
    }
    return STATIC_FALLBACK_TABS.map((t) => ({
      label: t.label,
      href: t.routePath,
      viewKey: t.viewKey,
      category: t.category,
    }));
  }, [defsQuery.data]);

  const subNavItems = tabs.map((t) => ({
    label: t.label,
    view: t.viewKey,
    href: `/reports?view=${encodeURIComponent(t.viewKey)}`,
  }));

  const requested = searchParams.get("view") ?? tabs[0]?.viewKey ?? "dhims2";
  const activeView = tabs.some((t) => t.viewKey === requested) ? requested : tabs[0]?.viewKey ?? "dhims2";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Assigned reporting shells from NHIMS catalogue — grouped for DHIMS2, facility summaries, and exports.
          {defsQuery.isError && (
            <span className="ml-2 text-xs text-muted-foreground"> (Showing cached navigation — catalogue refresh failed)</span>
          )}
        </p>
      </div>

      {!defsQuery.isError && defsQuery.data && defsQuery.data.length > 0 && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Catalog categories: </span>
            {[...new Set(defsQuery.data.map((d) => d.category))].join(" · ") || "—"}
          </CardContent>
        </Card>
      )}

      <ModuleSubNav items={subNavItems} basePath="/reports" />

      <div className="pt-2">
        {activeView === "dhims2" && <Dhims2View />}
        {activeView === "monthly" && <MonthlyView />}
        {activeView === "exports" && <ExportsView />}
      </div>
    </div>
  );
}

function parseShellView(routePath: string): string {
  const m = /[?&]view=([^&#]+)/.exec(routePath);
  if (!m?.[1]) return "dhims2";
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function Dhims2View() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reporting period: May 2026 · DHIMS2 shell</p>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" />
          Export to DHIMS2
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DHIMS2 Aggregate Indicators</CardTitle>
          <CardDescription>Auto-aggregated from facility data</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Indicator
                </th>
                <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Value
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DHIMS2_INDICATORS.map((row) => (
                <tr key={row.name}>
                  <td className="py-2.5 font-medium text-foreground">{row.name}</td>
                  <td className="py-2.5 text-right font-clinical text-foreground">{row.value}</td>
                  <td className="py-2.5 text-sm text-muted-foreground">{row.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlyView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Summary — May 2026</CardTitle>
        <CardDescription>Facility performance overview for submission</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MONTHLY_METRICS.map((m) => (
            <div key={m.label} className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-semibold font-clinical text-foreground">{m.value}</p>
              {m.note && <p className="mt-0.5 text-xs text-muted-foreground">{m.note}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ExportsView() {
  const EXPORT_ROWS = [
    { name: "DHIMS2 Monthly Return", format: "Excel", period: "May 2026", ready: true },
    { name: "OPD Morbidity Report", format: "PDF", period: "May 2026", ready: true },
    { name: "ANC Coverage Report", format: "Excel", period: "May 2026", ready: false },
    { name: "NHIS Claims Bundle", format: "XML", period: "May 2026", ready: true },
  ];

  return (
    <div className="space-y-3">
      {EXPORT_ROWS.map((exp) => (
        <div key={exp.name} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <p className="font-medium text-foreground">{exp.name}</p>
            <p className="text-xs text-muted-foreground">
              {exp.period} · {exp.format}
            </p>
          </div>
          <Button variant={exp.ready ? "default" : "outline"} size="sm" disabled={!exp.ready}>
            <Download className="mr-1.5 h-4 w-4" />
            {exp.ready ? "Download" : "Generating…"}
          </Button>
        </div>
      ))}
    </div>
  );
}

const DHIMS2_INDICATORS = [
  { name: "OPD New Attendances", value: "142", category: "OPD" },
  { name: "OPD Re-attendances", value: "89", category: "OPD" },
  { name: "Malaria (Confirmed) Cases", value: "31", category: "Disease Surveillance" },
  { name: "Malaria (Suspected) Cases", value: "12", category: "Disease Surveillance" },
  { name: "ANC 1st Visit", value: "8", category: "Maternal Health" },
  { name: "ANC 4th+ Visit", value: "5", category: "Maternal Health" },
  { name: "Deliveries at Facility", value: "3", category: "Maternal Health" },
  { name: "Under-5 OPD Visits", value: "48", category: "Child Health" },
  { name: "Family Planning Acceptors", value: "14", category: "Reproductive Health" },
];

const MONTHLY_METRICS = [
  { label: "Total OPD Visits", value: "231", note: "New + Re-attendances" },
  { label: "IPD Admissions", value: "38", note: "" },
  { label: "Lab Tests Performed", value: "312", note: "" },
  { label: "Deliveries", value: "3", note: "This month" },
  { label: "NHIS Claims Submitted", value: "187", note: "GHS 48,200 total" },
  { label: "Vaccine Coverage", value: "92%", note: "Under-1 BCG" },
];
