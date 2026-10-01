"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Percent,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { notify } from "@/lib/notify";

import {
  ChargeBuilder,
  type DraftCharge,
} from "@/components/billing/views/charge-builder";
import { TakePaymentDialog } from "@/components/billing/take-payment-dialog";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { MoneyInput } from "@/components/common/money-input";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import {
  billPatientPays,
  billStatus,
  chargeGroupLabel,
  formatMoney,
  isWaitingForPayment,
  methodLabel,
  parseMoney,
  patientShare,
  payerLabel,
  toChargeInput,
} from "@/lib/billing";
import { formatClinicalDate, formatClinicalDateTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { printArea } from "@/lib/print";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import { useAuthStore } from "@/store/auth.store";
import type { BillDto } from "@/types/finance.types";

/** BIL-03 — one bill: what it's for, who pays what, payments, and the actions on it. */
export function BillDetailView({ billId }: { billId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const facilityName = useAuthStore((s) => s.user?.facilityName ?? "");

  const invoiceQuery = useQuery({
    queryKey: queryKeys.billing.invoice(billId),
    queryFn: () => billingService.getInvoice(billId),
    refetchInterval: 30_000,
  });
  const bill = invoiceQuery.data?.bill;
  const patientBillsQuery = useQuery({
    queryKey: queryKeys.billing.patientBills(bill?.patientId ?? ""),
    queryFn: () =>
      billingService.billsForPatient(bill!.patientId!, { size: 50 }),
    enabled: Boolean(bill?.patientId),
  });

  const [paying, setPaying] = useState<BillDto | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draftCharges, setDraftCharges] = useState<DraftCharge[]>([]);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(
    null,
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.billing.all });
    void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
  };

  const addCharges = useMutation({
    mutationFn: () =>
      billingService.addCharges(billId, {
        charges: draftCharges.map(toChargeInput),
      }),
    onSuccess: () => {
      refresh();
      toast.success(
        `${draftCharges.length} item${draftCharges.length === 1 ? "" : "s"} added to the bill.`,
      );
      setDraftCharges([]);
      setAddOpen(false);
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });
  const removeCharge = useMutation({
    mutationFn: (itemId: string) => billingService.removeCharge(billId, itemId),
    onSuccess: () => {
      refresh();
      toast.success("Item removed from the bill.");
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });
  const discountMinor = parseMoney(discountAmount);
  const discountError = !discountAmount.trim()
    ? null
    : !Number.isFinite(discountMinor)
      ? "Enter an amount like 10.00."
      : bill && discountMinor > bill.subtotalMinor
        ? `That's more than the bill (${formatMoney(bill.subtotalMinor)}).`
        : null;
  const applyDiscount = useMutation({
    mutationFn: () =>
      billingService.applyDiscount(billId, {
        discountMinor,
        reason: discountReason.trim(),
      }),
    onSuccess: () => {
      refresh();
      toast.success("Discount applied.");
      setDiscountOpen(false);
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });
  const cancelBill = useMutation({
    mutationFn: () => billingService.cancelBill(billId, cancelReason.trim()),
    onSuccess: () => {
      refresh();
      toast.success("Bill cancelled.");
      setCancelReason("");
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  const earlierOwed = useMemo(() => {
    const others = (patientBillsQuery.data?.content ?? []).filter(
      (b) => b.id !== billId && isWaitingForPayment(b),
    );
    if (others.length === 0) return null;
    const oldest = [...others].sort((a, b) =>
      (a.issuedAt ?? "").localeCompare(b.issuedAt ?? ""),
    )[0];
    return {
      total: others.reduce((s, b) => s + b.balanceMinor, 0),
      since: oldest.issuedAt,
      count: others.length,
      firstId: oldest.id,
    };
  }, [patientBillsQuery.data, billId]);

  const back = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.push("/billing?view=bills")}
    >
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to bills
    </Button>
  );

  if (invoiceQuery.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <BannerSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState
          error={invoiceQuery.error}
          onRetry={() => void invoiceQuery.refetch()}
        />
      </div>
    );
  }

  const { payments, pharmacyCashLines = [] } = invoiceQuery.data;
  const b = invoiceQuery.data.bill;
  const s = billStatus(b);
  const closed = b.status === "CANCELLED" || b.status === "WRITTEN_OFF";
  // The backend locks lines once a bill is invoiced (INVOICE_ISSUED_LINES_LOCKED). It allows edits on
  // part-paid bills, but changing a bill after money was taken is left to finance, not the cashier.
  const canEdit = !closed && b.status !== "PAID" && b.status !== "INVOICED" && b.paidMinor === 0;
  const canPay = isWaitingForPayment(b);
  const patientPays = billPatientPays(b);
  const name = b.patientId ? naturalName(b.patientName) : "Walk-in customer";
  const waitingRx = new Set(
    pharmacyCashLines
      .filter((r) => r.awaitingCashPayment)
      .map((r) => r.billItemId),
  );

  return (
    <div className="space-y-4">
      {back}
      {b.patientId ? (
        <PatientBanner
          patientId={b.patientId}
          fallback={{ name: b.patientName, hospitalNumber: b.patientPublicId }}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-base font-semibold text-foreground">
            Walk-in customer
          </p>
        </div>
      )}

      {earlierOwed && (
        <InlineNotice tone="warning">
          {name} has {formatMoney(earlierOwed.total)} unpaid
          {earlierOwed.since
            ? ` from ${formatClinicalDate(earlierOwed.since)}`
            : ""}
          {earlierOwed.count > 1
            ? ` on ${earlierOwed.count} earlier bills`
            : ""}
          .{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() =>
              router.push(`/billing?view=bills&billId=${earlierOwed.firstId}`)
            }
          >
            Open {earlierOwed.count > 1 ? "the oldest" : "it"}
          </button>
        </InlineNotice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Items
                </h2>
                <p className="text-xs text-muted-foreground">
                  Bill <span className="font-clinical">{b.billNumber}</span>
                  {b.issuedAt ? ` · ${formatClinicalDateTime(b.issuedAt)}` : ""}
                  {b.visitReference ? ` · Visit ${b.visitReference}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={s.tone}>{s.label}</StatusPill>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Add item
                  </Button>
                )}
              </div>
            </div>

            {b.items.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nothing on this bill yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="py-2 pr-3 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">From</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Price
                      </th>
                      <th className="px-3 py-2 font-medium">NHIS</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Patient pays
                      </th>
                      {canEdit && (
                        <th className="w-10 py-2">
                          <span className="sr-only">Remove</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {b.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-foreground">
                            {it.serviceName}
                          </p>
                          {waitingRx.has(it.id) && (
                            <p className="text-xs text-muted-foreground">
                              Pharmacy gives it once paid
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {chargeGroupLabel(it.serviceGroup)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-clinical">
                          {Number(it.quantity)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-clinical">
                          {formatMoney(it.unitPriceMinor)}
                        </td>
                        <td className="px-3 py-2.5">
                          {it.nhisCoveredMinor > 0 ? (
                            <StatusPill tone="info">
                              {it.nhisCoveredMinor >= it.lineTotalMinor
                                ? "Covered"
                                : "Part covered"}
                            </StatusPill>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-clinical font-medium">
                          {formatMoney(patientShare(it))}
                        </td>
                        {canEdit && (
                          <td className="py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Remove ${it.serviceName}`}
                              onClick={() =>
                                setRemoving({ id: it.id, name: it.serviceName })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">
              Payments
            </h2>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No payments yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground">
                        {methodLabel(p.method)} ·{" "}
                        <span className="font-clinical">{p.receiptNumber}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.receivedAt
                          ? formatClinicalDateTime(p.receivedAt)
                          : "—"}
                        {p.momoTransactionId || p.bankReference
                          ? ` · Ref ${p.momoTransactionId || p.bankReference}`
                          : ""}
                      </p>
                    </div>
                    <span className="font-clinical font-medium">
                      {formatMoney(p.amountMinor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3 self-start rounded-xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-4">
          <dl className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatMoney(b.subtotalMinor)} />
            {b.discountMinor > 0 && (
              <Row
                label="Discount"
                value={`− ${formatMoney(b.discountMinor)}`}
              />
            )}
            {b.nhisCoveredMinor > 0 && (
              <Row
                label="NHIS covers"
                value={`− ${formatMoney(b.nhisCoveredMinor)}`}
              />
            )}
          </dl>
          <div className="rounded-lg bg-surface-subtle px-3 py-2">
            <p className="text-xs text-muted-foreground">Patient pays</p>
            <p className="font-clinical text-2xl font-semibold text-foreground">
              {formatMoney(patientPays)}
            </p>
          </div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Paid so far" value={formatMoney(b.paidMinor)} />
            <Row
              label="Still owed"
              value={formatMoney(b.balanceMinor)}
              strong
            />
            <Row label="How they pay" value={payerLabel(b.primaryPayer)} />
          </dl>
          {canPay && (
            <Button className="w-full" onClick={() => setPaying(b)}>
              <CreditCard className="mr-1.5 h-4 w-4" /> Take payment
            </Button>
          )}
          {b.status === "PAID" && (
            <InlineNotice tone="success">
              {patientPays === 0
                ? "Nothing to pay — NHIS covers this bill."
                : "Paid in full."}
            </InlineNotice>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => printArea("bill")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print bill
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDiscountAmount(b.discountMinor > 0 ? (b.discountMinor / 100).toFixed(2) : "");
                  setDiscountReason("");
                  setDiscountOpen(true);
                }}
              >
                <Percent className="mr-1.5 h-4 w-4" /> Apply discount
              </Button>
            )}
          </div>
          {!closed && b.status !== "PAID" && b.paidMinor === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => setCancelOpen(true)}
            >
              Cancel bill
            </Button>
          )}
        </aside>
      </div>

      {/* Printed bill — only shown on paper. */}
      <div
        data-print-area="bill"
        className="hidden space-y-3 text-sm print:block"
      >
        <div className="text-center">
          <p className="font-semibold">{facilityName}</p>
          <p className="text-xs">Bill {b.billNumber}</p>
        </div>
        <p>
          {name} {b.patientPublicId ? `· ${b.patientPublicId}` : ""}{" "}
          {b.issuedAt ? `· ${formatClinicalDate(b.issuedAt)}` : ""}
        </p>
        <table className="w-full">
          <tbody>
            {b.items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.serviceName} × {Number(it.quantity)}
                </td>
                <td className="text-right">{formatMoney(patientShare(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-semibold">
          Patient pays {formatMoney(patientPays)} · Paid{" "}
          {formatMoney(b.paidMinor)} · Still owed {formatMoney(b.balanceMinor)}
        </p>
      </div>

      <TakePaymentDialog
        bill={paying}
        onOpenChange={(o) => !o && setPaying(null)}
      />

      <FormDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setDraftCharges([]);
        }}
        size="xl"
        title="Add items to this bill"
        description="Services given on this visit that aren't on the bill yet, such as supplies or a procedure."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addCharges.mutate()}
              disabled={draftCharges.length === 0 || addCharges.isPending}
            >
              {addCharges.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {draftCharges.length > 1
                ? `Add ${draftCharges.length} items`
                : "Add item"}
            </Button>
          </>
        }
      >
        <ChargeBuilder
          charges={draftCharges}
          onChange={setDraftCharges}
          defaultPayer={b.primaryPayer}
        />
      </FormDialog>

      <FormDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        size="md"
        title={b.discountMinor > 0 ? "Change the discount" : "Apply a discount"}
        description={
          b.discountMinor > 0
            ? `The bill already has a ${formatMoney(b.discountMinor)} discount. What you enter replaces it; it isn't added on top.`
            : "Taken off the bill before NHIS and payments. The reason is kept with the bill."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDiscountOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => applyDiscount.mutate()}
              disabled={
                applyDiscount.isPending ||
                !Number.isFinite(discountMinor) ||
                Boolean(discountError) ||
                !discountReason.trim()
              }
            >
              {applyDiscount.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Apply discount
            </Button>
          </>
        }
      >
        <FormDialogSection>
          <div className="space-y-1.5">
            <Label htmlFor="discount-amount">Discount</Label>
            <MoneyInput
              id="discount-amount"
              value={discountAmount}
              onChange={setDiscountAmount}
              error={discountError ?? undefined}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="discount-reason">Reason</Label>
            <Textarea
              id="discount-reason"
              rows={2}
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="e.g. Hardship waiver approved by the administrator"
            />
          </div>
        </FormDialogSection>
      </FormDialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(o) => {
          setCancelOpen(o);
          if (!o) setCancelReason("");
        }}
        title={`Cancel bill ${b.billNumber}?`}
        description={`${name} won't be asked to pay it. The bill stays on record as cancelled.`}
        confirmLabel="Cancel bill"
        cancelLabel="Keep the bill"
        destructive
        pending={cancelBill.isPending}
        confirmDisabled={!cancelReason.trim()}
        footerExtra={
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Created twice by mistake"
            />
          </div>
        }
        onConfirm={async () => {
          await cancelBill.mutateAsync();
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? "this item"}?`}
        description="It comes off this bill. Only remove items that weren't given."
        confirmLabel="Remove item"
        cancelLabel="Keep it"
        destructive
        pending={removeCharge.isPending}
        onConfirm={async () => {
          if (removing) await removeCharge.mutateAsync(removing.id);
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`font-clinical ${strong ? "font-semibold text-foreground" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}
