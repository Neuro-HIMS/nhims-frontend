"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Percent,
  Plus,
  Printer,
  Receipt,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { billingService } from "@/services/billing.service";
import { ChargeBuilder, type DraftCharge } from "@/components/billing/views/charge-builder";
import { ghsInputToMinor, METHOD_LABEL, minorToGhs, PAYER_LABEL, showApiError } from "@/components/finance/finance-utils";
import {
  BILL_STATUS_LABEL,
  billStatusPill,
  CHARGE_KIND_ICON,
  formatDateTime,
} from "@/components/billing/lib/billing-utils";
import type { BillItemDto, PaymentMethod } from "@/types/finance.types";
import type { PharmacyCashLineDto } from "@/types/billing.types";
import { queryKeys } from "@/lib/query-keys";
import { Badge } from "@/components/ui/badge";

const MOMO_METHODS = new Set(["MOMO_MTN", "MOMO_VODAFONE", "MOMO_AIRTELTIGO"]);
const BANK_METHODS = new Set(["BANK_CARD", "BANK_TRANSFER", "CHEQUE"]);

export function BillDetailView({ billId }: { billId: string }) {
  const qc = useQueryClient();

  const invoice = useQuery({
    queryKey: ["billing", "invoice", billId],
    queryFn: () => billingService.getInvoice(billId),
    refetchInterval: 30_000,
  });

  // Local UI state
  const [addOpen, setAddOpen] = useState(false);
  const [draftCharges, setDraftCharges] = useState<DraftCharge[]>([]);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");

  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod | string>("CASH");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payerLabel, setPayerLabel] = useState<string>("");
  const [momoMsisdn, setMomoMsisdn] = useState<string>("");
  const [momoTxn, setMomoTxn] = useState<string>("");
  const [bankRef, setBankRef] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");

  const addCharges = useMutation({
    mutationFn: () =>
      billingService.addCharges(billId, {
        charges: draftCharges.map(({ rowId: _r, displayName: _d, ...rest }) => rest),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      toast.success(`${draftCharges.length} charge(s) added`);
      setDraftCharges([]);
      setAddOpen(false);
    },
    onError: (e) => toast.error(showApiError(e, "Could not add charges")),
  });

  const removeCharge = useMutation({
    mutationFn: (itemId: string) => billingService.removeCharge(billId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Charge removed");
      setRemoveChargeId(null);
    },
    onError: (e) => toast.error(showApiError(e, "Could not remove charge")),
  });

  const applyDiscount = useMutation({
    mutationFn: () => {
      const minor = ghsInputToMinor(discountAmount);
      if (Number.isNaN(minor) || minor < 0) throw new Error("Enter a valid discount amount");
      return billingService.applyDiscount(billId, { discountMinor: minor, reason: discountReason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Discount applied");
      setDiscountOpen(false);
    },
    onError: (e) => toast.error(showApiError(e, "Could not apply discount")),
  });

  const recordPayment = useMutation({
    mutationFn: () => {
      const minor = ghsInputToMinor(payAmount);
      if (Number.isNaN(minor) || minor <= 0) throw new Error("Enter a valid payment amount");
      const provider = payMethod.startsWith("MOMO_") ? payMethod.replace("MOMO_", "") : "";
      return billingService.recordPayment(billId, {
        method: payMethod,
        amountMinor: minor,
        payerLabel: payerLabel.trim(),
        momoProvider: provider,
        momoMsisdn: momoMsisdn.trim(),
        momoTransactionId: momoTxn.trim(),
        bankReference: bankRef.trim(),
        notes: payNotes.trim(),
      });
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: queryKeys.clinical.pharmacyQueue });
      qc.invalidateQueries({ queryKey: queryKeys.clinical.radiologyWorklist });
      toast.success(`Receipt ${p.receiptNumber}`, {
        description: `${METHOD_LABEL[p.method] ?? p.method} · GH₵ ${minorToGhs(p.amountMinor)}`,
      });
      setPayOpen(false);
      // Reset form
      setPayAmount("");
      setMomoMsisdn("");
      setMomoTxn("");
      setBankRef("");
      setPayNotes("");
    },
    onError: (e) => toast.error(showApiError(e, "Could not record payment")),
  });

  const cancelBill = useMutation({
    mutationFn: (reason: string) => billingService.cancelBill(billId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Bill cancelled");
      setCancelBillOpen(false);
      setCancelBillReason("");
    },
    onError: (e) => toast.error(showApiError(e, "Could not cancel bill")),
  });

  const [cancelBillOpen, setCancelBillOpen] = useState(false);
  const [cancelBillReason, setCancelBillReason] = useState("");
  const [removeChargeId, setRemoveChargeId] = useState<string | null>(null);

  const groupedItems = useMemo(() => {
    if (!invoice.data) return new Map<string, BillItemDto[]>();
    const m = new Map<string, BillItemDto[]>();
    for (const item of invoice.data.bill.items) {
      const arr = m.get(item.serviceGroup) ?? [];
      arr.push(item);
      m.set(item.serviceGroup, arr);
    }
    return m;
  }, [invoice.data]);

  const pharmacyByBillItem = useMemo(() => {
    const rows = invoice.data?.pharmacyCashLines;
    if (!rows?.length) return new Map<string, PharmacyCashLineDto>();
    const map = new Map<string, PharmacyCashLineDto>();
    for (const r of rows) {
      map.set(r.billItemId, r);
    }
    return map;
  }, [invoice.data?.pharmacyCashLines]);

  if (invoice.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice…
      </p>
    );
  }
  if (invoice.isError || !invoice.data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">Invoice not found.</p>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/billing?view=bills"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to bills</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { bill, payments, totalsByGroup, pharmacyCashLines = [] } = invoice.data;
  const pendingRxLines = pharmacyCashLines.filter((r) => r.awaitingCashPayment);
  const isClosed = ["CANCELLED", "WRITTEN_OFF"].includes(bill.status);
  const isPaid = bill.status === "PAID";
  const canEdit = !isClosed && !isPaid && bill.paidMinor === 0;
  const canPay = !isClosed && bill.balanceMinor > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/billing?view=bills">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <h2 className="font-clinical text-xl font-semibold">{bill.billNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {bill.patientName} · {bill.patientPublicId || "walk-in"} · issued {formatDateTime(bill.issuedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={billStatusPill(bill.status)}>{BILL_STATUS_LABEL[bill.status] ?? bill.status}</span>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Items + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">Services rendered</CardTitle>
                <CardDescription>
                  Lab tests, medications, imaging, consultation, supplies — every line is a bill item.
                  {pendingRxLines.length > 0 && (
                    <span className="mt-2 block text-[hsl(var(--clinical-urgent))]">
                      {pendingRxLines.length} prescription line{pendingRxLines.length === 1 ? "" : "s"} awaiting payment
                      before pharmacy can dispense.
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add charge
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setDiscountOpen(true)}>
                    <Percent className="mr-1.5 h-4 w-4" />
                    Discount
                  </Button>
                )}
                {!isClosed && bill.paidMinor === 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setCancelBillOpen(true)}>
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Cancel bill
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bill.items.length === 0 && (
                <div className="rounded-md border border-dashed border-border py-8 text-center">
                  <p className="text-sm text-muted-foreground">No charges on this bill yet.</p>
                </div>
              )}
              {Array.from(groupedItems.entries()).map(([group, items]) => {
                const total = totalsByGroup[group];
                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border pb-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {CHARGE_KIND_ICON[group] ?? "•"} {group} ({total?.itemCount ?? items.length})
                      </p>
                      <p className="font-clinical text-sm font-semibold">
                        GH₵ {minorToGhs(total?.lineTotalMinor ?? 0)}
                      </p>
                    </div>
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{it.serviceName}</p>
                            {pharmacyByBillItem.get(it.id)?.awaitingCashPayment && (
                              <Badge variant="outline" className="border-[hsl(var(--clinical-urgent))] text-[hsl(var(--clinical-urgent))]">
                                Rx awaits payment
                              </Badge>
                            )}
                          </div>
                          <p className="patient-id mt-0.5">
                            {it.serviceCode} · qty {it.quantity} · {PAYER_LABEL[it.payerType] ?? it.payerType}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="font-clinical text-sm font-semibold">GH₵ {minorToGhs(it.lineTotalMinor)}</p>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setRemoveChargeId(it.id)}
                              disabled={removeCharge.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>
                Record one or more payments against this bill. Methods include cash, mobile money (MTN/Telecel/AirtelTigo),
                bank card/transfer, NHIS reimbursement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 && (
                <div className="rounded-md border border-dashed border-border py-6 text-center">
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                </div>
              )}
              {payments.length > 0 && (
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 text-left">Receipt</th>
                        <th className="px-3 py-2 text-left">When</th>
                        <th className="px-3 py-2 text-left">Method</th>
                        <th className="px-3 py-2 text-left">Reference</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-clinical text-xs text-primary">{p.receiptNumber}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(p.receivedAt)}</td>
                          <td className="px-3 py-2 text-xs">{METHOD_LABEL[p.method] ?? p.method}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {p.momoTransactionId || p.bankReference || p.payerLabel || "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-clinical">GH₵ {minorToGhs(p.amountMinor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canPay && (
                <Button onClick={() => setPayOpen(true)} className="w-full sm:w-auto">
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Record payment · GH₵ {minorToGhs(bill.balanceMinor)}
                </Button>
              )}
              {isPaid && (
                <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))] px-3 py-2 text-sm text-[hsl(var(--clinical-routine))]">
                  <CheckCircle2 className="h-4 w-4" />
                  Bill fully settled
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Bill summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SummaryRow label="Subtotal" value={`GH₵ ${minorToGhs(bill.subtotalMinor)}`} />
            <SummaryRow label="Discount" value={`- GH₵ ${minorToGhs(bill.discountMinor)}`} />
            <SummaryRow label="Total" value={`GH₵ ${minorToGhs(bill.totalMinor)}`} bold />
            {bill.nhisCoveredMinor > 0 && (
              <SummaryRow label="NHIS covered" value={`GH₵ ${minorToGhs(bill.nhisCoveredMinor)}`} muted />
            )}
            <SummaryRow label="Paid" value={`GH₵ ${minorToGhs(bill.paidMinor)}`} muted />
            <div className="border-t border-border pt-2">
              <SummaryRow
                label="Outstanding"
                value={`GH₵ ${minorToGhs(bill.balanceMinor)}`}
                bold
                emphasis={bill.balanceMinor > 0 ? "warn" : "ok"}
              />
            </div>
            <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              <p>
                Primary payer: <span className="font-medium text-foreground">{PAYER_LABEL[bill.primaryPayer] ?? bill.primaryPayer}</span>
              </p>
              {bill.secondaryPayer !== bill.primaryPayer && (
                <p>
                  Secondary: <span className="font-medium text-foreground">{PAYER_LABEL[bill.secondaryPayer] ?? bill.secondaryPayer}</span>
                </p>
              )}
              {bill.visitReference && <p>Visit: <span className="font-clinical">{bill.visitReference}</span></p>}
              {bill.notes && <p className="mt-1">{bill.notes}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add charges dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add charges to {bill.billNumber}</DialogTitle>
            <DialogDescription>
              Append additional services rendered to this bill — labs, medications, imaging, supplies, etc.
            </DialogDescription>
          </DialogHeader>
          <ChargeBuilder charges={draftCharges} onChange={setDraftCharges} defaultPayer={bill.primaryPayer} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDraftCharges([]); setAddOpen(false); }}>Cancel</Button>
            <Button onClick={() => addCharges.mutate()} disabled={draftCharges.length === 0 || addCharges.isPending}>
              {addCharges.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Add {draftCharges.length || ""} charge{draftCharges.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount dialog */}
      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply bill-level discount</DialogTitle>
            <DialogDescription>Discount applies to the bill total before NHIS / payments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Discount amount (GH₵)</Label>
              <Input
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="font-clinical"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason</Label>
              <Textarea
                rows={2}
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g. compassionate waiver, staff family"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountOpen(false)}>Cancel</Button>
            <Button onClick={() => applyDiscount.mutate()} disabled={applyDiscount.isPending}>
              {applyDiscount.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Percent className="mr-1.5 h-4 w-4" />}
              Apply discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Outstanding balance: <span className="font-clinical font-semibold">GH₵ {minorToGhs(bill.balanceMinor)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METHOD_LABEL).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount (GH₵)</Label>
                <Input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={(bill.balanceMinor / 100).toFixed(2)}
                  className="font-clinical"
                />
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setPayAmount((bill.balanceMinor / 100).toFixed(2))}
                >
                  Pay full balance
                </button>
              </div>
            </div>

            {MOMO_METHODS.has(payMethod) && (
              <div className="grid gap-3 sm:grid-cols-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="space-y-1">
                  <Label className="text-xs">MoMo MSISDN</Label>
                  <Input
                    value={momoMsisdn}
                    onChange={(e) => setMomoMsisdn(e.target.value)}
                    placeholder="0244..."
                    className="font-clinical"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transaction ID</Label>
                  <Input
                    value={momoTxn}
                    onChange={(e) => setMomoTxn(e.target.value)}
                    placeholder="MoMo Txn ref"
                    className="font-clinical"
                  />
                </div>
              </div>
            )}

            {BANK_METHODS.has(payMethod) && (
              <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
                <Label className="text-xs">Bank reference / cheque number</Label>
                <Input
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="font-clinical"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Payer label (optional)</Label>
              <Input
                value={payerLabel}
                onChange={(e) => setPayerLabel(e.target.value)}
                placeholder="e.g. paid by relative, NHIS scheme name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1.5 h-4 w-4" />}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelBillOpen}
        onOpenChange={(open) => {
          setCancelBillOpen(open);
          if (!open) setCancelBillReason("");
        }}
        title="Cancel this bill?"
        description={`${bill.billNumber} · ${bill.patientName}. This reverses unpaid charges for reporting — provide an audit reason.`}
        confirmLabel="Cancel bill"
        destructive
        pending={cancelBill.isPending}
        footerExtra={
          <div className="space-y-1">
            <Label className="text-xs">Reason</Label>
            <Textarea
              rows={3}
              value={cancelBillReason}
              onChange={(e) => setCancelBillReason(e.target.value)}
              placeholder="Why is this bill being cancelled?"
            />
          </div>
        }
        onConfirm={async () => {
          const r = cancelBillReason.trim();
          if (!r) {
            toast.error("Cancellation reason is required");
            throw new Error("missing reason");
          }
          await cancelBill.mutateAsync(r);
        }}
      />

      <ConfirmDialog
        open={removeChargeId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveChargeId(null);
        }}
        title="Remove charge?"
        description="This line disappears from the open bill immediately. Removing the wrong charge may affect cashier reconciliation."
        confirmLabel="Remove charge"
        destructive
        pending={removeCharge.isPending}
        onConfirm={async () => {
          if (!removeChargeId) return;
          await removeCharge.mutateAsync(removeChargeId);
        }}
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  muted,
  emphasis,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  emphasis?: "warn" | "ok";
}) {
  const valueClass = [
    "font-clinical",
    bold ? "font-semibold" : "",
    muted ? "text-muted-foreground" : "text-foreground",
    emphasis === "warn" ? "text-[hsl(var(--clinical-urgent))]" : "",
    emphasis === "ok" ? "text-[hsl(var(--clinical-routine))]" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
