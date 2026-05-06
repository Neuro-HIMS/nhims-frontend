"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, FileText, Loader2, Receipt, TrendingUp, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { financeService } from "@/services/finance.service";
import { minorToGhs } from "@/components/finance/finance-utils";

export function FinanceDashboard() {
  const q = useQuery({
    queryKey: ["finance", "dashboard"],
    queryFn: () => financeService.dashboard(),
    refetchInterval: 30_000,
  });
  const summary = useQuery({
    queryKey: ["finance", "revenue", "summary"],
    queryFn: () => financeService.revenueSummary(),
  });

  if (q.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
      </p>
    );
  }
  if (q.isError || !q.data) {
    return <p className="text-sm text-destructive">Could not load finance dashboard.</p>;
  }

  const d = q.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          title="Today — total received"
          ghsValue={d.todayReceivedMinor}
          subline={`Month-to-date · GH₵ ${minorToGhs(d.monthReceivedMinor)}`}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          title="Today — IGF (cash, MoMo, card)"
          ghsValue={d.todayIgfMinor}
          subline={`MTD IGF · GH₵ ${minorToGhs(d.monthIgfMinor)}`}
          tone="igf"
        />
        <KpiCard
          icon={<Receipt className="h-4 w-4" />}
          title="Today — NHIS reimbursements"
          ghsValue={d.todayNhisMinor}
          subline={`MTD NHIS · GH₵ ${minorToGhs(d.monthNhisMinor)}`}
          tone="nhis"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Today — Mobile Money"
          ghsValue={d.todayMomoMinor}
          subline="MTN · Telecel · AirtelTigo combined"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Open billing pipeline</CardTitle>
            <CardDescription>Bills awaiting full settlement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Open / invoiced" value={String(d.openBills)} />
            <Row label="Partially paid" value={String(d.partialBills)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">NHIS claim pipeline</CardTitle>
            <CardDescription>Amounts awaiting NHIA action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Pending (DRAFT/READY)" value={`GH₵ ${minorToGhs(d.pendingClaimsMinor)}`} />
            <Row label="Submitted to NHIA" value={`GH₵ ${minorToGhs(d.submittedClaimsMinor)}`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Catalog health</CardTitle>
            <CardDescription>Configured services & active tariffs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Active services" value={String(d.activeServiceCount)} />
            <Row label="Active price rows" value={String(d.activePricingCount)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Last 30 days · revenue by stream
          </CardTitle>
          <CardDescription>
            Received cash + MoMo + reimbursements landed in this facility's accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}
          {summary.data && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(summary.data.receivedByStream).length === 0 && (
                <p className="text-sm text-muted-foreground">No revenue captured yet for the last 30 days.</p>
              )}
              {Object.entries(summary.data.receivedByStream).map(([stream, amt]) => (
                <div key={stream} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{stream}</p>
                  <p className="font-clinical text-lg">GH₵ {minorToGhs(amt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KpiProps {
  title: string;
  ghsValue: number;
  subline: string;
  icon: React.ReactNode;
  tone?: "igf" | "nhis";
}

function KpiCard({ title, ghsValue, subline, icon, tone }: KpiProps) {
  return (
    <Card className={tone === "nhis" ? "border-l-4 border-l-[hsl(var(--nhis-active))]" : tone === "igf" ? "border-l-4 border-l-primary" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="font-clinical text-2xl font-semibold text-foreground">GH₵ {minorToGhs(ghsValue)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subline}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-clinical">{value}</span>
    </div>
  );
}
