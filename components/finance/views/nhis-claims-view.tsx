"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const CLAIM_STATUSES: FinanceClaimStatus[] = ["DRAFT", "READY", "SUBMITTED", "REJECTED", "PAID"];

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

  const createMut = useMutation({
    mutationFn: financeService.createClaim,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "nhis", "claims"] });
      toast.success("Claim created");
      setPatientId("");
      setReference("");
      setAmountGhs("");
      setNotes("");
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
    const minor = ghsInputToMinor(amountGhs);
    if (Number.isNaN(minor)) {
      toast.error("Enter a valid GHS amount");
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
    });
  }

  const rows: FinanceNhisClaimDto[] = claims.data ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">NHIS claims pipeline</CardTitle>
          <CardDescription>
            Track claims from DRAFT → READY → SUBMITTED → PAID/REJECTED. Each PAID claim should be matched by an NHIS
            reimbursement receipt under <em>Payments</em> so it lands on the revenue ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Patient ID</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{row.patientPublicId || "—"}</td>
                  <td className="px-3 py-2">{row.claimReference || "—"}</td>
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
                <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">No claims yet.</td></tr>
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
          <Input placeholder="Amount (GHS)" value={amountGhs} onChange={(e) => setAmountGhs(e.target.value)} />
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
