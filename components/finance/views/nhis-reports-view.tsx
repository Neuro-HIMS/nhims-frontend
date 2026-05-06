"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { financeService } from "@/services/finance.service";
import { showApiError } from "@/components/finance/finance-utils";

export function NhisReportsView() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["finance", "nhis", "reports"],
    queryFn: () => financeService.listReports(),
  });

  const [periodLabel, setPeriodLabel] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const genMut = useMutation({
    mutationFn: () =>
      financeService.generateReport({
        periodLabel: periodLabel.trim() || undefined,
        reportType: "NHIS_SUMMARY",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "nhis", "reports"] });
      toast.success("Snapshot generated");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  const rows = q.data ?? [];
  const parsed = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const r of rows) {
      try {
        map.set(r.id, JSON.parse(r.payloadJson));
      } catch {
        map.set(r.id, r.payloadJson);
      }
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">NHIS analytics snapshots</CardTitle>
          <CardDescription>
            Immutable JSON snapshots aggregating claim volumes by status and active pricing items — used for NHIA
            reconciliation and audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Period label (optional)</span>
            <Input placeholder="e.g. 2026-Q2" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
          </div>
          <Button onClick={() => genMut.mutate()} disabled={genMut.isPending}>
            {genMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Generate snapshot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saved snapshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{row.reportType}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.periodLabel} · {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                >
                  {expanded === row.id ? "Hide JSON" : "View payload"}
                </Button>
              </div>
              {expanded === row.id && (
                <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                  {JSON.stringify(parsed.get(row.id), null, 2)}
                </pre>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No snapshots yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
