"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/query-keys";
import { reportsService } from "@/services/reports.service";
import { toast } from "sonner";

const STATIC_FALLBACK_TABS = [
  { label: "DHIMS2 Summary", category: "DHIMS2", routePath: "/reports?view=dhims2", viewKey: "dhims2" },
  { label: "Monthly Report", category: "Facility", routePath: "/reports?view=monthly", viewKey: "monthly" },
  { label: "Exports", category: "Exports", routePath: "/reports?view=exports", viewKey: "exports" },
] as const;

export function ReportsWorkspace() {
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));

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

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reporting period</p>
          <Input
            type="month"
            className="h-9 w-[11rem] font-clinical"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <p className="pb-1 text-xs text-muted-foreground">
          Aggregates use UTC month boundaries and your signed-in facility.
        </p>
      </div>

      <ModuleSubNav items={subNavItems} basePath="/reports" />

      <div className="pt-2">
        {activeView === "dhims2" && <Dhims2View month={month} />}
        {activeView === "monthly" && <MonthlyView month={month} />}
        {activeView === "exports" && <ExportsView month={month} />}
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

function Dhims2View({ month }: { month: string }) {
  const q = useQuery({
    queryKey: queryKeys.reporting.dhims2(month),
    queryFn: () => reportsService.runDhims2(month),
    staleTime: 60_000,
  });

  async function download() {
    try {
      await reportsService.downloadDhims2Csv(month);
    } catch {
      toast.error("Could not download CSV.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {q.data?.periodLabel ? `${q.data.periodLabel} · DHIMS2 aggregates` : "DHIMS2 aggregates"}
        </p>
        <Button variant="outline" size="sm" onClick={download} disabled={!month}>
          <Download className="mr-1.5 h-4 w-4" />
          Export to CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DHIMS2 aggregate indicators</CardTitle>
          <CardDescription>Facility-derived counts plus placeholders for indicators not yet linked to clinical coding.</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading aggregates…
            </div>
          ) : q.isError ? (
            <p className="py-8 text-center text-sm text-destructive">Could not load DHIMS2 run.</p>
          ) : (
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
                {(q.data?.indicators ?? []).map((row) => (
                  <tr key={row.code}>
                    <td className="py-2.5 font-medium text-foreground">{row.label}</td>
                    <td className="py-2.5 text-right font-clinical text-foreground">
                      {row.value === null ? "—" : row.value}
                    </td>
                    <td className="py-2.5 text-sm text-muted-foreground">{row.category}</td>
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

function MonthlyView({ month }: { month: string }) {
  const q = useQuery({
    queryKey: queryKeys.reporting.monthly(month),
    queryFn: () => reportsService.runMonthly(month),
    staleTime: 60_000,
  });

  async function download() {
    try {
      await reportsService.downloadMonthlyCsv(month);
    } catch {
      toast.error("Could not download CSV.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">
            Monthly summary{q.data?.periodLabel ? ` · ${q.data.periodLabel}` : ""}
          </CardTitle>
          <CardDescription>Facility performance snapshot for the selected month.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={download} disabled={!month}>
          <Download className="mr-1.5 h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading summary…
          </div>
        ) : q.isError ? (
          <p className="py-8 text-center text-sm text-destructive">Could not load monthly summary.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(q.data?.metrics ?? []).map((m) => (
              <div key={m.code} className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-2xl font-semibold font-clinical text-foreground">
                  {m.value === null ? "—" : m.value}
                </p>
                {m.note ? <p className="mt-0.5 text-xs text-muted-foreground">{m.note}</p> : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function exportKindFromRoute(routePath: string): "dhims2" | "monthly" | null {
  const p = routePath.toLowerCase();
  if (p.includes("dhims2")) return "dhims2";
  if (p.includes("monthly")) return "monthly";
  return null;
}

function ExportsView({ month }: { month: string }) {
  const exportsQuery = useQuery({
    queryKey: queryKeys.reporting.exports,
    queryFn: () => reportsService.listExportDefinitions(),
    staleTime: 120_000,
  });

  async function run(kind: "dhims2" | "monthly") {
    try {
      if (kind === "dhims2") await reportsService.downloadDhims2Csv(month);
      else await reportsService.downloadMonthlyCsv(month);
    } catch {
      toast.error("Download failed.");
    }
  }

  const catalogue = exportsQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/15 p-4">
        <p className="text-sm font-medium text-foreground">Standard CSV extracts</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Same payloads as the DHIMS2 and Monthly tabs — suitable for spreadsheets or upstream NHIMS tooling.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="default" onClick={() => run("dhims2")}>
            <Download className="mr-1.5 h-4 w-4" />
            DHIMS2 CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("monthly")}>
            <Download className="mr-1.5 h-4 w-4" />
            Monthly summary CSV
          </Button>
        </div>
      </div>

      {exportsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading export catalogue…
        </div>
      ) : catalogue.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No export shells are assigned for your role yet — use the standard extracts above.
        </p>
      ) : (
        catalogue.map((exp) => {
          const kind = exportKindFromRoute(exp.routePath);
          return (
            <div
              key={exp.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{exp.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{exp.description || exp.code}</p>
              </div>
              <Button
                variant={kind ? "default" : "outline"}
                size="sm"
                disabled={!kind}
                onClick={() => kind && run(kind)}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {kind ? "Download" : "No generator"}
              </Button>
            </div>
          );
        })
      )}
    </div>
  );
}
