"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { ReceiptCard } from "@/components/billing/receipt-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, TableToolbar, type DataTableColumn } from "@/components/common/data-table";
import { FormDialog } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { daysAgoLocal, formatMoney, isTakenAtDesk, localDay, METHOD_KINDS, methodKind, methodLabel, todayLocal, totalsByMethod, type MethodKind } from "@/lib/billing";
import { formatTime, formatClinicalDate } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { canReversePayments } from "@/lib/permissions";
import { printArea } from "@/lib/print";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import { useAuthStore } from "@/store/auth.store";
import type { BillDto, PaymentDto } from "@/types/finance.types";

type Range = "TODAY" | "YESTERDAY" | "7D" | "CUSTOM";

/** BIL-06 — payments taken, by day and method; reprint receipts (and reverse, BIL-07). */
export function PaymentsView() {
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const mayReverse = canReversePayments(role) && billingService.reversalAvailable();

  const [range, setRange] = useState<Range>("TODAY");
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState(todayLocal());
  const [kind, setKind] = useState<MethodKind | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [reprint, setReprint] = useState<PaymentDto | null>(null);
  const [reversing, setReversing] = useState<PaymentDto | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const paymentsQuery = useQuery({ queryKey: queryKeys.billing.payments, queryFn: () => billingService.listPayments(), refetchInterval: 60_000 });
  // Payments carry only the bill id — patient names come from the bills list.
  const billsQuery = useQuery({ queryKey: queryKeys.billing.bills("ALL", ""), queryFn: () => billingService.listBills({}) });
  const reversalsQuery = useQuery({ queryKey: queryKeys.billing.reversals, queryFn: () => billingService.reversals(), enabled: billingService.reversalAvailable() });

  const billById = useMemo(() => new Map((billsQuery.data ?? []).map((b) => [b.id, b] as const)), [billsQuery.data]);
  const reversed = useMemo(() => new Map((reversalsQuery.data ?? []).map((r) => [r.paymentId, r] as const)), [reversalsQuery.data]);
  const reprintBillQuery = useQuery({
    queryKey: queryKeys.billing.invoice(reprint?.billId ?? ""),
    queryFn: () => billingService.getInvoice(reprint!.billId!),
    enabled: Boolean(reprint?.billId) && !billById.has(reprint?.billId ?? ""),
  });
  const reprintBill = reprint?.billId ? (billById.get(reprint.billId) ?? reprintBillQuery.data?.bill) : undefined;

  const [start, end] =
    range === "TODAY" ? [todayLocal(), todayLocal()] : range === "YESTERDAY" ? [daysAgoLocal(1), daysAgoLocal(1)] : range === "7D" ? [daysAgoLocal(6), todayLocal()] : [from, to];

  const rows = useMemo(() => {
    if (!paymentsQuery.data) return undefined;
    const q = search.trim().toLowerCase();
    return paymentsQuery.data.filter((p) => {
      const day = localDay(p.receivedAt);
      if (!day || day < start || day > end) return false;
      if (kind !== "ALL" && methodKind(p.method) !== kind) return false;
      if (q) {
        const bill = p.billId ? billById.get(p.billId) : undefined;
        const text = `${p.receiptNumber} ${p.momoTransactionId} ${p.bankReference} ${bill?.patientName ?? ""} ${bill?.patientPublicId ?? ""} ${bill?.billNumber ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [paymentsQuery.data, start, end, kind, search, billById]);

  // Money taken at the desk; NHIS/insurance payouts and waivers are shown apart.
  const live = (rows ?? []).filter((p) => !reversed.has(p.id));
  const counted = live.filter((p) => isTakenAtDesk(p.method));
  const otherSum = live.filter((p) => !isTakenAtDesk(p.method)).reduce((s, p) => s + p.amountMinor, 0);
  const sums = totalsByMethod(counted);
  const total = counted.reduce((s, p) => s + p.amountMinor, 0);

  const reverseMut = useMutation({
    mutationFn: () => billingService.reversePayment(reversing!.id, reverseReason.trim()),
    onSuccess: () => {
      toast.success(`Payment ${reversing!.receiptNumber} reversed.`);
      void qc.invalidateQueries({ queryKey: queryKeys.billing.payments });
      setReverseReason("");
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  function download() {
    const header = ["Date", "Time", "Receipt", "Patient", "Hospital number", "Bill", "Method", "Reference", "Amount (GHS)", "Reversed"];
    const lines = (rows ?? []).map((p) => {
      const bill = p.billId ? billById.get(p.billId) : undefined;
      return [
        p.receivedAt ? formatClinicalDate(p.receivedAt) : "",
        p.receivedAt ? formatTime(p.receivedAt) : "",
        p.receiptNumber,
        bill ? naturalName(bill.patientName) : "",
        bill?.patientPublicId ?? "",
        bill?.billNumber ?? "",
        methodLabel(p.method),
        p.momoTransactionId || p.bankReference || "",
        (p.amountMinor / 100).toFixed(2),
        reversed.has(p.id) ? "Yes" : "",
      ];
    });
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${start}${end !== start ? `-to-${end}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const patientCell = (p: PaymentDto) => {
    const bill: BillDto | undefined = p.billId ? billById.get(p.billId) : undefined;
    if (!bill) return <span className="text-muted-foreground">{billsQuery.isPending ? "…" : "Older bill — open it to see"}</span>;
    return (
      <div>
        <p className="font-medium text-foreground">{naturalName(bill.patientName)}</p>
        <p className="patient-id">{bill.patientPublicId}</p>
      </div>
    );
  };

  const columns: DataTableColumn<PaymentDto>[] = [
    {
      key: "time",
      header: "Time",
      cell: (p) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {p.receivedAt ? (range === "TODAY" || range === "YESTERDAY" ? formatTime(p.receivedAt) : `${formatClinicalDate(p.receivedAt)} · ${formatTime(p.receivedAt)}`) : "—"}
        </span>
      ),
    },
    { key: "receipt", header: "Receipt", cell: (p) => <span className="font-clinical">{p.receiptNumber}</span> },
    { key: "patient", header: "Patient", cell: patientCell },
    { key: "method", header: "Method", hideOnTablet: true, cell: (p) => <span className="text-muted-foreground">{methodLabel(p.method)}</span> },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (p) =>
        reversed.has(p.id) ? (
          <span className="flex items-center justify-end gap-2">
            <StatusPill tone="neutral">Reversed</StatusPill>
            <span className="font-clinical text-muted-foreground line-through">{formatMoney(p.amountMinor)}</span>
          </span>
        ) : (
          <span className="font-clinical font-medium">{formatMoney(p.amountMinor)}</span>
        ),
    },
  ];

  const filtered = search.trim() !== "" || kind !== "ALL";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="stat-card-label">Total</p>
          <p className="stat-card-value">{formatMoney(total)}</p>
          <p className="text-xs text-muted-foreground">
            {counted.length} payment{counted.length === 1 ? "" : "s"}
          </p>
        </div>
        {METHOD_KINDS.map((m) => (
          <div key={m.kind} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="stat-card-label">{m.label}</p>
            <p className="font-clinical text-lg font-semibold text-foreground">{formatMoney(sums[m.kind])}</p>
          </div>
        ))}
      </div>

      {otherSum > 0 && (
        <p className="text-xs text-muted-foreground">Also received {formatMoney(otherSum)} from NHIS, insurance or waivers. That isn&apos;t counted above.</p>
      )}
      {billsQuery.isError && (
        <InlineNotice tone="warning">
          Patient names couldn&apos;t be loaded.{" "}
          <button type="button" className="font-medium underline" onClick={() => void billsQuery.refetch()}>
            Try again
          </button>
        </InlineNotice>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        isLoading={paymentsQuery.isPending}
        error={paymentsQuery.isError ? paymentsQuery.error : undefined}
        onRetry={() => void paymentsQuery.refetch()}
        onRowClick={(p) => p.billId && router.push(`/billing?view=bills&billId=${p.billId}`)}
        rowActions={(p) => (
          <>
            <DropdownMenuItem onSelect={() => setReprint(p)}>Reprint receipt</DropdownMenuItem>
            {p.billId && <DropdownMenuItem onSelect={() => router.push(`/billing?view=bills&billId=${p.billId}`)}>Open the bill</DropdownMenuItem>}
            {mayReverse && !reversed.has(p.id) && (
              <DropdownMenuItem className="text-destructive" onSelect={() => setReversing(p)}>
                Reverse payment
              </DropdownMenuItem>
            )}
          </>
        )}
        toolbar={
          <TableToolbar
            search={{ value: search, onChange: setSearch, placeholder: "Receipt, patient or reference" }}
            filters={
              <>
                <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                  <SelectTrigger className="h-9 w-36" aria-label="Dates">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAY">Today</SelectItem>
                    <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                    <SelectItem value="7D">Last 7 days</SelectItem>
                    <SelectItem value="CUSTOM">Choose dates</SelectItem>
                  </SelectContent>
                </Select>
                {range === "CUSTOM" && (
                  <>
                    <Input type="date" aria-label="From" className="h-9 w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                    <Input type="date" aria-label="To" className="h-9 w-40" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                  </>
                )}
                <Select value={kind} onValueChange={(v) => setKind(v as MethodKind | "ALL")}>
                  <SelectTrigger className="h-9 w-44" aria-label="Method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any method</SelectItem>
                    {METHOD_KINDS.map((m) => (
                      <SelectItem key={m.kind} value={m.kind}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            actions={
              <Button variant="outline" size="sm" onClick={download} disabled={!rows || rows.length === 0}>
                <Download className="mr-1.5 h-4 w-4" /> Download as spreadsheet
              </Button>
            }
          />
        }
        empty={
          filtered
            ? { illustration: "no-results", title: "No payments match", description: "Try another word or method.", action: { label: "Clear filters", onClick: () => { setSearch(""); setKind("ALL"); } } }
            : { illustration: "empty-list", title: range === "TODAY" ? "No payments yet today" : "No payments on these dates", description: "Payments appear here as soon as they're recorded." }
        }
      />
      <p className="text-xs text-muted-foreground">Shows the most recent 200 payments.</p>

      <FormDialog
        open={reprint !== null}
        onOpenChange={(o) => !o && setReprint(null)}
        size="md"
        title="Reprint receipt"
        footer={
          <>
            <Button variant="outline" onClick={() => setReprint(null)}>
              Close
            </Button>
            <Button onClick={() => printArea("receipt")}>
              <Printer className="mr-1.5 h-4 w-4" /> Print receipt
            </Button>
          </>
        }
      >
        {reprint && (
          <ReceiptCard
            payment={reprint}
            patientName={reprintBill?.patientName ?? ""}
            hospitalNumber={reprintBill?.patientPublicId}
            billNumber={reprintBill?.billNumber}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={reversing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReversing(null);
            setReverseReason("");
          }
        }}
        title={`Reverse payment ${reversing?.receiptNumber ?? ""}?`}
        description={`${formatMoney(reversing?.amountMinor ?? 0)} will no longer count as collected. Give the money back to the patient separately.`}
        confirmLabel="Reverse payment"
        cancelLabel="Keep it"
        destructive
        pending={reverseMut.isPending}
        confirmDisabled={!reverseReason.trim()}
        footerExtra={
          <div className="space-y-1.5">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Textarea id="reverse-reason" rows={2} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="e.g. Charged twice by mistake" />
          </div>
        }
        onConfirm={async () => {
          await reverseMut.mutateAsync();
        }}
      />
    </div>
  );
}
