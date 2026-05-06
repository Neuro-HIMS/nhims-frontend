"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeService } from "@/services/finance.service";
import type { BillDto, PaymentDto } from "@/types/finance.types";
import { ghsInputToMinor, METHOD_LABEL, minorToGhs, showApiError } from "@/components/finance/finance-utils";

export function PaymentsView() {
  const qc = useQueryClient();
  const bills = useQuery({
    queryKey: ["finance", "bills"],
    queryFn: () => financeService.listBills(),
  });
  const payments = useQuery({
    queryKey: ["finance", "payments"],
    queryFn: () => financeService.listPayments(),
  });
  const methods = useQuery({
    queryKey: ["finance", "catalog", "payment-methods"],
    queryFn: () => financeService.paymentMethods(),
  });

  const [billId, setBillId] = useState<string>("");
  const [method, setMethod] = useState<string>("CASH");
  const [amount, setAmount] = useState("");
  const [payerLabel, setPayerLabel] = useState("");
  const [momoMsisdn, setMomoMsisdn] = useState("");
  const [momoTxn, setMomoTxn] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [notes, setNotes] = useState("");

  const recordMut = useMutation({
    mutationFn: financeService.recordPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "payments"] });
      qc.invalidateQueries({ queryKey: ["finance", "bills"] });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      toast.success("Receipt issued");
      setAmount("");
      setMomoMsisdn("");
      setMomoTxn("");
      setBankRef("");
      setNotes("");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  const outstandingBills = useMemo(
    () =>
      (bills.data ?? []).filter(
        (b: BillDto) => b.status !== "PAID" && b.status !== "CANCELLED" && b.status !== "WRITTEN_OFF",
      ),
    [bills.data],
  );

  const isMomo = method.startsWith("MOMO_");
  const isBank = method === "BANK_TRANSFER" || method === "BANK_CARD" || method === "CHEQUE";

  function submit() {
    const minor = ghsInputToMinor(amount);
    if (Number.isNaN(minor) || minor <= 0) {
      toast.error("Enter a valid GH₵ amount");
      return;
    }
    recordMut.mutate({
      billId: billId || null,
      method,
      amountMinor: minor,
      currency: "GHS",
      payerLabel: payerLabel.trim(),
      momoMsisdn: momoMsisdn.trim(),
      momoTransactionId: momoTxn.trim(),
      bankReference: bankRef.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payments &amp; receipts</CardTitle>
          <CardDescription>
            Cashier desk — record cash, Mobile Money (MTN, Telecel, AirtelTigo), POS card, bank transfer, cheque, NHIS
            reimbursement, or insurance payouts. Each receipt updates the bill balance and writes a revenue ledger entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Receipt #</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium text-right">Amount (GH₵)</th>
                  <th className="px-3 py-2 font-medium">MoMo / Bank ref</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {(payments.data ?? []).map((p: PaymentDto) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{p.receiptNumber}</td>
                    <td className="px-3 py-2">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{minorToGhs(p.amountMinor)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.momoTransactionId || p.bankReference || p.momoMsisdn || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.receivedAt ? new Date(p.receivedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
                {(payments.data ?? []).length === 0 && !payments.isLoading && (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">No payments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Bill (optional — leave empty for unallocated)</p>
            <Select value={billId || "__none"} onValueChange={(v) => setBillId(v === "__none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a bill…" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="__none">— No bill —</SelectItem>
                {outstandingBills.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.billNumber} · {b.patientName} · GH₵ {minorToGhs(b.balanceMinor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Method</p>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(methods.data ?? []).map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input placeholder="Amount (GH₵)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="Payer / payee label" value={payerLabel} onChange={(e) => setPayerLabel(e.target.value)} />

          {isMomo && (
            <>
              <Input placeholder="MoMo phone (subscriber MSISDN)" value={momoMsisdn} onChange={(e) => setMomoMsisdn(e.target.value)} />
              <Input placeholder="MoMo transaction ID" value={momoTxn} onChange={(e) => setMomoTxn(e.target.value)} />
            </>
          )}
          {isBank && (
            <Input placeholder="Bank reference / cheque #" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
          )}

          <Textarea placeholder="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

          <Button onClick={submit} disabled={recordMut.isPending}>
            {recordMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Record payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
