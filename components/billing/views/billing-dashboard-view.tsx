"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import Link from "next/link";
import { CreditCard, FilePlus2, Receipt, Wallet, AlertCircle, Loader2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { billingService } from "@/services/billing.service";
import { minorToGhs } from "@/components/finance/finance-utils";

export function BillingDashboardView() {
  const dash = useQuery({
    queryKey: ["billing", "dashboard"],
    queryFn: () => billingService.dashboard(),
    refetchInterval: 60_000,
  });

  if (dash.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
      </p>
    );
  }
  if (dash.isError || !dash.data) {
    return <p className="text-sm text-destructive">Unable to load billing dashboard.</p>;
  }

  const d = dash.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="Today collected"
          value={`GH₵ ${minorToGhs(d.todayCollectedMinor)}`}
          sub={`${d.paidTodayCount} receipts`}
          accent="ok"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <BigStat
          label="Outstanding"
          value={`GH₵ ${minorToGhs(d.outstandingMinor)}`}
          sub={`${d.openBills + d.invoicedBills + d.partialBills} unsettled bills`}
          accent="warn"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <BigStat
          label="This month"
          value={`GH₵ ${minorToGhs(d.monthCollectedMinor)}`}
          sub="all payment methods"
          accent="info"
          icon={<Wallet className="h-4 w-4" />}
        />
        <BigStat
          label="Bills issued"
          value={String(d.openBills + d.invoicedBills + d.partialBills)}
          sub={`${d.openBills} open · ${d.invoicedBills} invoiced · ${d.partialBills} partial`}
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s collections by method</CardTitle>
            <CardDescription>Breakdown of receipts taken today.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MethodCell label="Cash" value={d.todayCashMinor} />
              <MethodCell label="Mobile Money" value={d.todayMomoMinor} />
              <MethodCell label="Card / Transfer" value={d.todayCardMinor} />
              <MethodCell label="Insurance / NHIS" value={d.todayInsuranceMinor} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Collections from <span className="font-medium text-foreground">cash</span>,{" "}
              <span className="font-medium text-foreground">mobile money</span> (MTN, Telecel, AirtelTigo),{" "}
              <span className="font-medium text-foreground">card / bank transfer</span>, and NHIS / insurance reimbursements.
              The figures refresh every minute.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Most common cashier shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href="/billing?view=new"><FilePlus2 className="mr-2 h-4 w-4" /> Open a new bill</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/billing?view=bills"><Receipt className="mr-2 h-4 w-4" /> View invoices</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/billing?view=payments"><CreditCard className="mr-2 h-4 w-4" /> Payment history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ok" | "warn" | "info";
  icon?: ReactNode;
}) {
  const cls =
    accent === "ok"
      ? "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))] text-[hsl(var(--clinical-routine))]"
      : accent === "warn"
      ? "border-[hsl(var(--clinical-urgent))] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
      : accent === "info"
      ? "border-[hsl(var(--notice-info-border))] bg-[hsl(var(--notice-info-bg))] text-[hsl(var(--notice-info-foreground))]"
      : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border px-4 py-3 ${cls}`}>
      <div className="flex items-center justify-between gap-2 opacity-80">
        <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="mt-1 font-clinical text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-75">{sub}</p>}
    </div>
  );
}

function MethodCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-clinical text-lg font-semibold text-foreground">GH₵ {minorToGhs(value)}</p>
    </div>
  );
}
