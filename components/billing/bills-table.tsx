"use client";

import { useRouter } from "next/navigation";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import type { EmptyStateProps } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  billPatientPays,
  billStatus,
  formatMoney,
  isWaitingForPayment,
  payerLabel,
} from "@/lib/billing";
import { formatClinicalDateTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import type { BillDto } from "@/types/finance.types";

interface BillsTableProps {
  rows: BillDto[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: EmptyStateProps;
  toolbar?: React.ReactNode;
  onTakePayment: (bill: BillDto) => void;
  /** Reporting lists: no Take payment / Open buttons (the row still opens the bill). */
  hideActions?: boolean;
}

/** BIL-02 table — also the overview's "Waiting for payment" list. */
export function BillsTable({
  rows,
  isLoading,
  error,
  onRetry,
  empty,
  toolbar,
  onTakePayment,
  hideActions = false,
}: BillsTableProps) {
  const router = useRouter();
  const open = (b: BillDto) =>
    router.push(`/billing?view=bills&billId=${b.id}`);

  const columns: DataTableColumn<BillDto>[] = [
    {
      key: "bill",
      header: "Bill",
      cell: (b) => (
        <div>
          <p className="font-clinical font-medium text-foreground">
            {b.billNumber}
          </p>
          <p className="text-xs text-muted-foreground">
            {b.issuedAt ? formatClinicalDateTime(b.issuedAt) : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      cell: (b) => (
        <div>
          <p className="font-medium text-foreground">
            {b.patientId ? naturalName(b.patientName) : "Walk-in customer"}
          </p>
          <p className="patient-id">{b.patientPublicId || "—"}</p>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      hideOnTablet: true,
      cell: (b) => (
        <span className="text-muted-foreground">
          {b.items.length} · {payerLabel(b.primaryPayer)}
        </span>
      ),
    },
    {
      key: "pays",
      header: "Patient pays",
      className: "text-right",
      cell: (b) => (
        <span className="font-clinical">{formatMoney(billPatientPays(b))}</span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      className: "text-right",
      hideOnTablet: true,
      cell: (b) => (
        <span className="font-clinical">{formatMoney(b.paidMinor)}</span>
      ),
    },
    {
      key: "balance",
      header: "Still owed",
      className: "text-right",
      cell: (b) => (
        <span
          className={`font-clinical ${b.balanceMinor > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
        >
          {formatMoney(b.balanceMinor)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => {
        const s = billStatus(b);
        return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
      },
    },
    {
      key: "action",
      header: "",
      className: "text-right",
      cell: (b) =>
        isWaitingForPayment(b) ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onTakePayment(b);
            }}
          >
            Take payment
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              open(b);
            }}
          >
            Open
          </Button>
        ),
    },
  ];

  return (
    <DataTable
      columns={hideActions ? columns.filter((c) => c.key !== "action") : columns}
      rows={rows}
      getRowId={(b) => b.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      empty={empty}
      toolbar={toolbar}
      onRowClick={open}
    />
  );
}
