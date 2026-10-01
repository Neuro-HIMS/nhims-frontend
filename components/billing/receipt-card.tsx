"use client";

import { formatMoney, methodLabel } from "@/lib/billing";
import { formatClinicalDateTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { useAuthStore } from "@/store/auth.store";
import type { PaymentDto } from "@/types/finance.types";

/** The printable receipt (BIL-05). Print with `printArea("receipt")`. */
export function ReceiptCard({
  payment,
  patientName,
  hospitalNumber,
  billNumber,
  stillOwedMinor,
  cashReceivedMinor,
  changeMinor,
}: {
  payment: PaymentDto;
  patientName: string;
  hospitalNumber?: string;
  billNumber?: string;
  /** Leave out when it isn't known (e.g. reprinting an old receipt). */
  stillOwedMinor?: number;
  /** Cash handed over and change given, when the patient paid more than was owed. */
  cashReceivedMinor?: number;
  changeMinor?: number;
}) {
  const facilityName = useAuthStore((s) => s.user?.facilityName ?? "");
  const ref = payment.momoTransactionId || payment.bankReference;
  return (
    <div data-print-area="receipt" className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
      <div className="text-center">
        <p className="font-semibold text-foreground">{facilityName || "Receipt"}</p>
        <p className="text-xs text-muted-foreground">Payment receipt</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Receipt</dt>
        <dd className="font-clinical">{payment.receiptNumber}</dd>
        <dt className="text-muted-foreground">Date</dt>
        <dd>{payment.receivedAt ? formatClinicalDateTime(payment.receivedAt) : "—"}</dd>
        <dt className="text-muted-foreground">Patient</dt>
        <dd>
          {naturalName(patientName)} {hospitalNumber && <span className="font-clinical text-xs text-muted-foreground">{hospitalNumber}</span>}
        </dd>
        {billNumber && (
          <>
            <dt className="text-muted-foreground">Bill</dt>
            <dd className="font-clinical">{billNumber}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Paid by</dt>
        <dd>
          {methodLabel(payment.method)}
          {payment.payerLabel ? ` · ${payment.payerLabel}` : ""}
        </dd>
        {ref && (
          <>
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="font-clinical">{ref}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="font-clinical font-semibold">{formatMoney(payment.amountMinor)}</dd>
        {cashReceivedMinor !== undefined && (
          <>
            <dt className="text-muted-foreground">Cash received</dt>
            <dd className="font-clinical">{formatMoney(cashReceivedMinor)}</dd>
            <dt className="text-muted-foreground">Change</dt>
            <dd className="font-clinical">{formatMoney(changeMinor ?? 0)}</dd>
          </>
        )}
        {stillOwedMinor !== undefined && (
          <>
            <dt className="text-muted-foreground">Still owed</dt>
            <dd className="font-clinical">{formatMoney(stillOwedMinor)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
