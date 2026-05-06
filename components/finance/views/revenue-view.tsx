"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { financeService } from "@/services/finance.service";
import { METHOD_LABEL, minorToGhs, STREAM_LABEL } from "@/components/finance/finance-utils";

export function RevenueView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(undefined);
  const [appliedTo, setAppliedTo] = useState<string | undefined>(undefined);

  const q = useQuery({
    queryKey: ["finance", "revenue", "summary", appliedFrom ?? "", appliedTo ?? ""],
    queryFn: () => financeService.revenueSummary({ from: appliedFrom, to: appliedTo }),
  });

  function applyDates() {
    setAppliedFrom(from.trim() || undefined);
    setAppliedTo(to.trim() || undefined);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Revenue analytics</CardTitle>
          <CardDescription>
            Where did the money come from. IGF lines are anything paid out-of-pocket; NHIS lines are reimbursable claims and
            received reimbursements; donor + capitation are isolated for management reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">From</p>
            <Input placeholder="YYYY-MM-DD" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">To</p>
            <Input placeholder="YYYY-MM-DD" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <Button variant="outline" onClick={applyDates}>Apply window</Button>
        </CardContent>
      </Card>

      {q.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}

      {q.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard title="Received" amount={q.data.totalReceivedMinor} subline={`${q.data.periodFrom} → ${q.data.periodTo}`} />
            <KpiCard title="Accrued (claims pending)" amount={q.data.totalAccruedMinor} subline="NHIS + insurance accruals" />
            <KpiCard title="Earned (cash basis)" amount={q.data.totalEarnedMinor} subline="Bills issued for OOP / IGF" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Received by revenue stream</CardTitle>
                <CardDescription>IGF / NHIS / donor / private insurance / corporate / other</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(q.data.receivedByStream).length === 0 && (
                  <p className="text-muted-foreground">No payments in this window.</p>
                )}
                {Object.entries(q.data.receivedByStream)
                  .sort(([, a], [, b]) => b - a)
                  .map(([stream, amt]) => (
                    <div key={stream} className="flex items-center justify-between">
                      <span>{STREAM_LABEL[stream] ?? stream}</span>
                      <span className="font-clinical">GH₵ {minorToGhs(amt)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Accrued by stream (NHIS pipeline)</CardTitle>
                <CardDescription>Claims not yet reimbursed — the receivable book.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(q.data.accruedByStream).length === 0 && (
                  <p className="text-muted-foreground">No accruals in this window.</p>
                )}
                {Object.entries(q.data.accruedByStream)
                  .sort(([, a], [, b]) => b - a)
                  .map(([stream, amt]) => (
                    <div key={stream} className="flex items-center justify-between">
                      <span>{STREAM_LABEL[stream] ?? stream}</span>
                      <span className="font-clinical">GH₵ {minorToGhs(amt)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Received by payment method</CardTitle>
              <CardDescription>Cash, Mobile Money (MTN/Telecel/AirtelTigo), bank, NHIS reimbursements…</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(q.data.receivedByMethod).length === 0 && (
                  <p className="text-sm text-muted-foreground">No method breakdown to show.</p>
                )}
                {Object.entries(q.data.receivedByMethod)
                  .sort(([, a], [, b]) => b - a)
                  .map(([m, amt]) => (
                    <div key={m} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">{METHOD_LABEL[m] ?? m}</p>
                      <p className="font-clinical text-lg">GH₵ {minorToGhs(amt)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Day</th>
                      <th className="px-3 py-2 font-medium text-right">Received (GH₵)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.dailyReceived.map((p) => (
                      <tr key={p.day} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{p.day}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{minorToGhs(p.amountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, amount, subline }: { title: string; amount: number; subline: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-clinical text-2xl font-semibold text-foreground">GH₵ {minorToGhs(amount)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subline}</p>
      </CardContent>
    </Card>
  );
}
