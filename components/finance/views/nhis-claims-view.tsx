"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPatientPublicIdLive } from "@/lib/patient-public-id";
import { financeService } from "@/services/finance.service";
import type { FinanceClaimStatus, FinanceNhisClaimDto } from "@/types/finance.types";
import { ghsInputToMinor, minorToGhs, showApiError } from "@/components/finance/finance-utils";

const CLAIM_STATUSES: FinanceClaimStatus[] = [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "REJECTED",
  "PAID",
  "ACTION_REQUIRED",
];

export function NhisClaimsView() {
  const qc = useQueryClient();
  const periodYear = new Date().getFullYear();

  const claims = useQuery({
    queryKey: ["finance", "nhis", "claims"],
    queryFn: () => financeService.listClaims(),
  });

  const [patientId, setPatientId] = useState("");
  const [reference, setReference] = useState("");
  const [amountGhs, setAmountGhs] = useState("");
  const [status, setStatus] = useState<FinanceClaimStatus>("DRAFT");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [lineService, setLineService] = useState("");
  const [lineTariff, setLineTariff] = useState("");
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [lineUnitGhs, setLineUnitGhs] = useState("");

  const createMut = useMutation({
    mutationFn: financeService.createClaim,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "nhis", "claims"] });
      toast.success("Claim created");
      setPatientId("");
      setReference("");
      setAmountGhs("");
      setNotes("");
      setLineService("");
      setLineTariff("");
      setLineDesc("");
      setLineQty("1");
      setLineUnitGhs("");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, st }: { id: string; st: string }) => financeService.patchClaimStatus(id, st),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "nhis", "claims"] });
      toast.success("Status updated");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  function submit() {
    const unitMinor = ghsInputToMinor(lineUnitGhs);
    const hasLine = Boolean(lineService.trim() && lineUnitGhs.trim() && !Number.isNaN(unitMinor));
    const lines = hasLine
      ? [
          {
            serviceCode: lineService.trim(),
            description: lineDesc.trim(),
            tariffCode: lineTariff.trim(),
            quantity: Number.parseInt(lineQty, 10) || 1,
            unitAmountMinor: unitMinor,
          },
        ]
      : undefined;
    const minor = lines && lines.length > 0 ? 0 : ghsInputToMinor(amountGhs);
    if (!lines && Number.isNaN(minor)) {
      toast.error("Enter a valid GHS amount (or add a priced line item)");
      return;
    }
    if (lines && lines[0] && lines[0].unitAmountMinor < 0) {
      toast.error("Line unit price must be valid");
      return;
    }
    createMut.mutate({
      patientPublicId: patientId.trim(),
      claimReference: reference.trim(),
      amountMinor: minor,
      status,
      servicePeriodStart: periodStart.trim() || undefined,
      servicePeriodEnd: periodEnd.trim() || undefined,
      notes: notes.trim(),
      lines,
    });
  }

  const rows: FinanceNhisClaimDto[] = claims.data ?? [];
  const actionRequired = rows.filter((r) => r.status === "ACTION_REQUIRED");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">NHIS claims pipeline</CardTitle>
          <CardDescription>
            Track claims from DRAFT → READY → SUBMITTED → PAID / REJECTED / ACTION_REQUIRED (gateway follow-up). Each PAID
            claim should be matched by an NHIS reimbursement receipt under <em>Payments</em> so it lands on the revenue
            ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-md border border-border">
          {actionRequired.length > 0 && (
            <Alert variant="destructive" className="mb-3 border-[hsl(var(--clinical-urgent))]">
              <AlertTriangle />
              <AlertTitle>Action required — {actionRequired.length} claim(s)</AlertTitle>
              <AlertDescription>
                NHIA or internal review flagged these claims. Update paperwork, then move back to READY or SUBMITTED using
                the row control.
              </AlertDescription>
            </Alert>
          )}
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Patient ID</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium text-right">Lines</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.status === "ACTION_REQUIRED"
                      ? "border-b border-border bg-[hsl(var(--clinical-urgent-bg))]/35 last:border-0"
                      : "border-b border-border last:border-0"
                  }
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.patientPublicId || "—"}</td>
                  <td className="px-3 py-2">{row.claimReference || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.lines?.length ?? 0}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{minorToGhs(row.amountMinor)}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.status}
                      onValueChange={(st) => statusMut.mutate({ id: row.id, st })}
                      disabled={statusMut.isPending}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAIM_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.servicePeriodStart ?? "—"} → {row.servicePeriodEnd ?? "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !claims.isLoading && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-muted-foreground">No claims yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New claim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Patient ID (optional)"
            className="font-clinical"
            value={patientId}
            onChange={(e) => setPatientId(formatPatientPublicIdLive(e.target.value))}
          />
          <Input placeholder="Claim reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          <Input placeholder="Amount (GHS) — optional if line items below" value={amountGhs} onChange={(e) => setAmountGhs(e.target.value)} />
          <div className="rounded-md border border-dashed border-border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Optional claim line (tariff / GDRG)</p>
            <Input placeholder="Service code" className="font-clinical" value={lineService} onChange={(e) => setLineService(e.target.value)} />
            <Input placeholder="Tariff code" className="font-clinical" value={lineTariff} onChange={(e) => setLineTariff(e.target.value)} />
            <Input placeholder="Description" value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Qty" className="w-20 font-clinical" value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
              <Input placeholder="Unit (GHS)" className="flex-1 font-clinical" value={lineUnitGhs} onChange={(e) => setLineUnitGhs(e.target.value)} />
            </div>
            <p className="text-[0.7rem] text-muted-foreground">
              When a line is filled, the claim total is the sum of lines and the header amount field is ignored.
            </p>
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as FinanceClaimStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Service period start</p>
            <DatePickerField
              value={periodStart}
              placeholder="Period start"
              fromYear={periodYear - 10}
              toYear={periodYear + 2}
              onChange={setPeriodStart}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Service period end</p>
            <DatePickerField
              value={periodEnd}
              placeholder="Period end"
              fromYear={periodYear - 10}
              toYear={periodYear + 2}
              onChange={setPeriodEnd}
            />
          </div>
          <Textarea placeholder="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create claim"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
