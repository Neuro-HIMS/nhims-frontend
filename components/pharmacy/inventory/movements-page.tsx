"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { InventoryPageHeader } from "@/components/pharmacy/inventory/shared/inventory-page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";

export function MovementsPage() {
  const [itemFilter, setItemFilter] = useState<string>("__all__");
  const [needle, setNeedle] = useState("");

  const itemsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.items("true"),
    queryFn: () => pharmacyInventoryService.listInventoryItems(true),
  });

  const movementsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.movements(itemFilter === "__all__" ? "" : itemFilter),
    queryFn: () =>
      pharmacyInventoryService.listMovements(itemFilter === "__all__" ? undefined : itemFilter),
  });

  const rows = useMemo(() => {
    const list = movementsQuery.data ?? [];
    const q = needle.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.itemDisplayName.toLowerCase().includes(q) ||
        (m.batchNo ?? "").toLowerCase().includes(q) ||
        m.movementType.toLowerCase().includes(q) ||
        (m.referenceNote ?? "").toLowerCase().includes(q),
    );
  }, [movementsQuery.data, needle]);

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        title="Stock movements"
        description="Audit trail of receipts and adjustments. Dispense movements will appear here when dispensing is wired to inventory."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5 sm:w-64">
          <Label>Filter by item</Label>
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All items</SelectItem>
              {(itemsQuery.data ?? []).map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  {it.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="max-w-sm flex-1 space-y-1.5">
          <Label htmlFor="mov-q">Search</Label>
          <Input
            id="mov-q"
            value={needle}
            onChange={(e) => setNeedle(e.target.value)}
            placeholder="Item, batch, type, note…"
            className="font-clinical"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {movementsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading movements…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  When
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Item
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Batch
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Δ Qty
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  By
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-clinical text-muted-foreground">
                      {m.createdAt ? formatDateTime(m.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{m.itemDisplayName}</td>
                    <td className="px-4 py-3 patient-id">{m.batchNo || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.movementType.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-right font-clinical font-medium">{Number(m.quantityDelta)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.createdByName || "—"}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground" title={m.referenceNote}>
                      {m.referenceNote || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
