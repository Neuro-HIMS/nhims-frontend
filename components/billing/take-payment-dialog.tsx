"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { MoneyInput } from "@/components/common/money-input";
import { SuccessPanel } from "@/components/common/success-panel";
import { ReceiptCard } from "@/components/billing/receipt-card";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { formatMoney, METHOD_KINDS, MOMO_NETWORKS, parseMoney, type MethodKind } from "@/lib/billing";

import { naturalName } from "@/lib/display-name";
import { printArea } from "@/lib/print";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import type { BillDto, PaymentDto } from "@/types/finance.types";

interface TakePaymentDialogProps {
  bill: BillDto | null;
  onOpenChange: (open: boolean) => void;
}

/** BIL-05 — take a payment against a bill and print the receipt. */
export function TakePaymentDialog(props: TakePaymentDialogProps) {
  // Mounted per bill so each payment starts with the balance filled in.
  if (!props.bill) return null;
  return (
    <Body
      key={props.bill.id}
      bill={props.bill}
      onOpenChange={props.onOpenChange}
    />
  );
}

function Body({
  bill,
  onOpenChange,
}: {
  bill: BillDto;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const due = bill.balanceMinor;
  const name = naturalName(bill.patientName);

  const [kind, setKind] = useState<MethodKind>("CASH");
  const [received, setReceived] = useState((due / 100).toFixed(2));
  const [network, setNetwork] = useState<string>("MOMO_MTN");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoTxn, setMomoTxn] = useState("");
  const [bankMethod, setBankMethod] = useState<"BANK_TRANSFER" | "CHEQUE">(
    "BANK_TRANSFER",
  );
  const [reference, setReference] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);
  const [receipt, setReceipt] = useState<PaymentDto | null>(null);
  // No answer from the server (timeout / dropped connection): the payment may have been saved,
  // so retrying is blocked until the bill has been checked — otherwise the patient can be charged twice.
  const [unconfirmed, setUnconfirmed] = useState(false);

  const receivedMinor = parseMoney(received);
  // Cash can be more than what's owed (we give change); other methods take the exact amount.
  const amountMinor = Number.isFinite(receivedMinor)
    ? kind === "CASH"
      ? Math.min(receivedMinor, due)
      : receivedMinor
    : NaN;
  const change =
    kind === "CASH" && Number.isFinite(receivedMinor)
      ? Math.max(0, receivedMinor - due)
      : 0;

  const amountError = !Number.isFinite(receivedMinor)
    ? "Enter the amount received, e.g. 120.00."
    : receivedMinor <= 0
      ? "Enter an amount above 0."
      : kind !== "CASH" && receivedMinor > due
        ? `That's more than the ${formatMoney(due)} owed.`
        : null;
  const momoError =
    kind === "MOMO" && !momoTxn.trim()
      ? "Enter the transaction number from the Mobile Money message."
      : null;
  const problem = amountError ?? momoError;

  const method =
    kind === "CASH"
      ? "CASH"
      : kind === "MOMO"
        ? network
        : kind === "CARD"
          ? "BANK_CARD"
          : bankMethod;

  const payMut = useMutation({
    mutationFn: () =>
      billingService.recordPayment(bill.id, {
        method,
        amountMinor,
        payerLabel: paidBy.trim(),
        momoProvider: kind === "MOMO" ? network.replace("MOMO_", "") : "",
        momoMsisdn: kind === "MOMO" ? momoNumber.trim() : "",
        momoTransactionId: kind === "MOMO" ? momoTxn.trim() : "",
        bankReference:
          kind === "CARD" || kind === "BANK" ? reference.trim() : "",
        notes: notes.trim(),
      }),
    onError: (e) => {
      if (isAxiosError(e) && !e.response) setUnconfirmed(true);
    },
    onSuccess: (p) => {
      setReceipt(p);
      // Paid items unlock for the next teams (J02 step 3).
      void qc.invalidateQueries({ queryKey: ["billing"] });
      // Everything clinical: worklists and the open dispense / lab / scan screens.
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
    },
  });

  const checkMut = useMutation({
    mutationFn: () => billingService.getInvoice(bill.id),
    onSuccess: (inv) => {
      void qc.invalidateQueries({ queryKey: ["billing"] });
      if (inv.bill.paidMinor > bill.paidMinor) {
        const newest = [...inv.payments].sort((a, b) => (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""))[0];
        void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
        if (newest) setReceipt(newest);
        notify.success("The payment did go through. Don't take the money again.");
      } else {
        setUnconfirmed(false);
        payMut.reset();
        notify.info("The payment didn't go through. You can record it again.");
      }
    },
    onError: (e) => notify.error(`The bill couldn't be checked. ${getFriendlyError(e).message}`),
  });

  const remaining = receipt ? Math.max(0, due - receipt.amountMinor) : due;

  if (receipt) {
    return (
      <FormDialog
        open
        onOpenChange={onOpenChange}
        size="md"
        title={`Payment recorded — ${name}`}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button onClick={() => printArea("receipt")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print receipt
            </Button>
          </>
        }
      >
        <SuccessPanel
          title={`Payment of ${formatMoney(receipt.amountMinor)} recorded`}
          description={`Receipt ${receipt.receiptNumber}.${remaining > 0 ? ` ${formatMoney(remaining)} is still owed.` : " The bill is paid in full."}${change > 0 ? ` Give ${formatMoney(change)} change.` : ""}`}
        />
        <ReceiptCard
          payment={receipt}
          patientName={bill.patientName}
          hospitalNumber={bill.patientPublicId}
          billNumber={bill.billNumber}
          stillOwedMinor={remaining}
          cashReceivedMinor={kind === "CASH" && change > 0 ? receivedMinor : undefined}
          changeMinor={kind === "CASH" && change > 0 ? change : undefined}
        />
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !payMut.isPending && onOpenChange(o)}
      size="lg"
      title={`Take payment — ${name}`}
      description={`Bill ${bill.billNumber}`}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={payMut.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={payMut.isPending || unconfirmed}
            onClick={() => {
              setTried(true);
              if (!problem) payMut.mutate();
            }}
          >
            {payMut.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Record payment
          </Button>
        </>
      }
    >
      <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3">
        <p className="text-xs text-muted-foreground">Amount due</p>
        <p className="font-clinical text-3xl font-semibold text-foreground">
          {formatMoney(due)}
        </p>
      </div>

      {unconfirmed ? (
        <InlineNotice tone="warning" title="We couldn't confirm the payment">
          The connection dropped before the system answered, so the payment may or may not have been saved. Check the bill before taking any money again.{" "}
          <Button size="sm" variant="outline" className="mt-2" disabled={checkMut.isPending} onClick={() => checkMut.mutate()}>
            {checkMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Check the bill
          </Button>
        </InlineNotice>
      ) : (
        payMut.isError && (
          <InlineNotice tone="error" title="Payment wasn't recorded. Nothing was charged.">
            {getFriendlyError(payMut.error).message} Try again.
          </InlineNotice>
        )
      )}

      <FormDialogSection title="How they're paying" columns={1}>
        <RadioGroup
          value={kind}
          onValueChange={(v) => setKind(v as MethodKind)}
          className="grid gap-2 sm:grid-cols-4"
          aria-label="How they're paying"
        >
          {METHOD_KINDS.map((m) => (
            <ChoiceOption key={m.kind}>
              <RadioGroupItem value={m.kind} />
              {m.label}
            </ChoiceOption>
          ))}
        </RadioGroup>
      </FormDialogSection>

      <FormDialogSection title="Amount">
        <div className="space-y-1.5">
          <Label htmlFor="pay-received">Amount received</Label>
          <MoneyInput
            id="pay-received"
            value={received}
            onChange={setReceived}
            error={tried ? (amountError ?? undefined) : undefined}
          />
          {!amountError &&
            Number.isFinite(receivedMinor) &&
            receivedMinor < due && (
              <p className="text-xs text-muted-foreground">
                Part payment: {formatMoney(due - receivedMinor)} will still be
                owed.
              </p>
            )}
        </div>
        {kind === "CASH" && change > 0 && (
          <div
            className="self-end rounded-lg border border-border bg-card px-4 py-2"
            role="status"
          >
            <p className="text-xs text-muted-foreground">Change to give</p>
            <p className="font-clinical text-xl font-semibold text-foreground">
              {formatMoney(change)}
            </p>
          </div>
        )}
      </FormDialogSection>

      {kind === "MOMO" && (
        <FormDialogSection title="Mobile Money">
          <div className="space-y-1.5 sm:col-span-2">
            <Label id="pay-network-label">Network</Label>
            <RadioGroup
              value={network}
              onValueChange={setNetwork}
              className="flex flex-wrap gap-2"
              aria-labelledby="pay-network-label"
            >
              {MOMO_NETWORKS.map((n) => (
                <ChoiceOption key={n.code}>
                  <RadioGroupItem value={n.code} />
                  {n.label}
                </ChoiceOption>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-momo">Mobile Money number (optional)</Label>
            <Input
              id="pay-momo"
              inputMode="tel"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
              placeholder="e.g. 024 123 4567"
              className="font-clinical"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-momo-ref">Transaction number</Label>
            <Input
              id="pay-momo-ref"
              value={momoTxn}
              onChange={(e) => setMomoTxn(e.target.value)}
              className="font-clinical"
              aria-invalid={tried && Boolean(momoError)}
            />
            {tried && momoError && (
              <p className="text-xs text-destructive">{momoError}</p>
            )}
          </div>
        </FormDialogSection>
      )}

      {kind === "BANK" && (
        <FormDialogSection title="Bank">
          <div className="space-y-1.5 sm:col-span-2">
            <Label id="pay-bank-label">Type</Label>
            <RadioGroup
              value={bankMethod}
              onValueChange={(v) =>
                setBankMethod(v as "BANK_TRANSFER" | "CHEQUE")
              }
              className="flex flex-wrap gap-2"
              aria-labelledby="pay-bank-label"
            >
              <ChoiceOption>
                <RadioGroupItem value="BANK_TRANSFER" /> Bank transfer
              </ChoiceOption>
              <ChoiceOption>
                <RadioGroupItem value="CHEQUE" /> Cheque
              </ChoiceOption>
            </RadioGroup>
          </div>
        </FormDialogSection>
      )}

      {(kind === "CARD" || kind === "BANK") && (
        <FormDialogSection>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pay-ref">
              {kind === "CARD"
                ? "Card slip number (optional)"
                : bankMethod === "CHEQUE"
                  ? "Cheque number (optional)"
                  : "Transfer reference (optional)"}
            </Label>
            <Input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="font-clinical"
            />
          </div>
        </FormDialogSection>
      )}

      <FormDialogSection title="More details">
        <div className="space-y-1.5">
          <Label htmlFor="pay-payer">Paid by (optional)</Label>
          <Input
            id="pay-payer"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            placeholder="e.g. Her brother, Kofi"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pay-notes">Note (optional)</Label>
          <Textarea
            id="pay-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </FormDialogSection>
    </FormDialog>
  );
}
