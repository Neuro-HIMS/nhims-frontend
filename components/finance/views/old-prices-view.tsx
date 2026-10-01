"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { formatMoney } from "@/lib/billing";
import { queryKeys } from "@/lib/query-keys";
import { financeService } from "@/services/finance.service";
import type { FinancePriceItemDto } from "@/types/finance.types";

/** FIN-03 — the price list from before Services and prices; view only. */
export function OldPricesView() {
  const q = useQuery({ queryKey: queryKeys.finance.oldPrices, queryFn: () => financeService.listPricing() });
  const columns: DataTableColumn<FinancePriceItemDto>[] = [
    {
      key: "item",
      header: "Item",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.itemName}</p>
          <p className="font-clinical text-xs text-muted-foreground">{r.itemCode}</p>
        </div>
      ),
    },
    { key: "category", header: "Group", cell: (r) => <span className="text-muted-foreground">{r.category || "—"}</span> },
    { key: "price", header: "Price", className: "text-right", cell: (r) => <span className="font-clinical">{formatMoney(r.unitPriceMinor)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusPill tone="neutral">{r.active ? "Was in use" : "Switched off"}</StatusPill> },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">These are prices from before the current price list. You can&apos;t change them; use Services and prices instead.</p>
      <DataTable
        columns={columns}
        rows={q.data}
        getRowId={(r) => r.id}
        isLoading={q.isPending}
        error={q.isError ? q.error : undefined}
        onRetry={() => void q.refetch()}
        empty={{ illustration: "empty-list", title: "No old prices", description: "This hospital started on the current price list, so there's nothing here." }}
      />
    </div>
  );
}
