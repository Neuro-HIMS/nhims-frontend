"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DataTable, TableToolbar, type DataTableColumn } from "@/components/common/data-table";
import { InventoryPageHeader } from "@/components/pharmacy/inventory/shared/inventory-page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatClinicalDateTime } from "@/lib/dates";
import { cleanPersonName } from "@/lib/display-name";
import { movementLabel, movementNote } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type { PharmacyStockMovementDto } from "@/types/pharmacy-inventory.types";

/** PHA-08 — every delivery, adjustment and medicine given, newest first. */
export function MovementsPage() {
  const [itemFilter, setItemFilter] = useState<string>("__all__");
  const [needle, setNeedle] = useState("");

  const itemsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.items("true"),
    queryFn: () => pharmacyInventoryService.listInventoryItems(true),
  });
  const movementsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.movements(itemFilter === "__all__" ? "" : itemFilter),
    queryFn: () => pharmacyInventoryService.listMovements(itemFilter === "__all__" ? undefined : itemFilter),
  });

  const rows = useMemo(() => {
    if (!movementsQuery.data) return undefined;
    const q = needle.trim().toLowerCase();
    if (!q) return movementsQuery.data;
    return movementsQuery.data.filter(
      (m) =>
        m.itemDisplayName.toLowerCase().includes(q) ||
        (m.batchNo ?? "").toLowerCase().includes(q) ||
        movementLabel(m.movementType).toLowerCase().includes(q) ||
        movementNote(m.referenceNote).toLowerCase().includes(q),
    );
  }, [movementsQuery.data, needle]);

  const columns: DataTableColumn<PharmacyStockMovementDto>[] = [
    { key: "when", header: "When", cell: (m) => <span className="whitespace-nowrap text-muted-foreground">{m.createdAt ? formatClinicalDateTime(m.createdAt) : "—"}</span> },
    { key: "medicine", header: "Medicine", cell: (m) => <span className="font-medium text-foreground">{m.itemDisplayName}</span> },
    { key: "batch", header: "Batch", cell: (m) => <span className="whitespace-nowrap patient-id">{m.batchNo || "—"}</span> },
    { key: "type", header: "What happened", cell: (m) => <span className="text-muted-foreground">{movementLabel(m.movementType)}</span> },
    {
      key: "change",
      header: "Change",
      className: "text-right",
      cell: (m) => {
        const d = Number(m.quantityDelta);
        return <span className={`font-clinical font-medium ${d < 0 ? "text-foreground" : "text-success"}`}>{d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "0"}</span>;
      },
    },
    { key: "by", header: "By", hideOnTablet: true, cell: (m) => <span className="text-muted-foreground">{cleanPersonName(m.createdByName) || "—"}</span> },
    {
      key: "note",
      header: "Note",
      hideOnTablet: true,
      cell: (m) => (
        <span className="block max-w-[220px] truncate text-muted-foreground" title={movementNote(m.referenceNote)}>
          {movementNote(m.referenceNote)}
        </span>
      ),
    },
  ];

  const filtered = needle.trim() !== "" || itemFilter !== "__all__";

  return (
    <div className="space-y-6">
      <InventoryPageHeader title="Movements" description="Every delivery, adjustment and medicine given, newest first." />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(m) => m.id}
        isLoading={movementsQuery.isPending}
        error={movementsQuery.isError ? movementsQuery.error : undefined}
        onRetry={() => void movementsQuery.refetch()}
        toolbar={
          <TableToolbar
            search={{ value: needle, onChange: setNeedle, placeholder: "Medicine, batch or note" }}
            filters={
              <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger className="h-9 w-56" aria-label="Medicine">
                  <SelectValue placeholder="All medicines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All medicines</SelectItem>
                  {(itemsQuery.data ?? []).map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        }
        empty={
          filtered
            ? {
                illustration: "no-results",
                title: "Nothing matches",
                description: "Try another word or choose All medicines.",
                action: {
                  label: "Show everything",
                  onClick: () => {
                    setNeedle("");
                    setItemFilter("__all__");
                  },
                },
              }
            : { illustration: "empty-list", title: "No stock changes yet", description: "Deliveries, adjustments and medicines given will be listed here." }
        }
      />
    </div>
  );
}
