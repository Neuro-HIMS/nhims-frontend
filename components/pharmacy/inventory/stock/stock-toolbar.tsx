"use client";

import { FilterChipBar, type FilterChip } from "@/components/pharmacy/inventory/shared/filter-chip-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StockOverviewStatus } from "@/types/pharmacy-inventory.types";

export type StockStatusFilter = StockOverviewStatus | "ALL";

interface StockToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StockStatusFilter;
  onStatusFilterChange: (v: StockStatusFilter) => void;
  activeItemsOnly: boolean;
  onActiveItemsOnlyChange: (v: boolean) => void;
  chips: FilterChip[];
  onRemoveChip: (id: string) => void;
  onResetFilters: () => void;
  onReceiveClick: () => void;
}

export function StockToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  activeItemsOnly,
  onActiveItemsOnlyChange,
  chips,
  onRemoveChip,
  onResetFilters,
  onReceiveClick,
}: StockToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="max-w-sm flex-1 space-y-1.5">
          <Label htmlFor="stock-q">Search</Label>
          <Input
            id="stock-q"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Medicine or SKU…"
            className="font-clinical"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock-status">Status filter</Label>
          <select
            id="stock-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-44"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StockStatusFilter)}
          >
            <option value="ALL">All statuses</option>
            <option value="ADEQUATE">Adequate</option>
            <option value="LOW">Low stock</option>
            <option value="OUT">Out of stock</option>
            <option value="EXPIRING_SOON">Expiring soon</option>
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={!activeItemsOnly}
            onChange={(e) => onActiveItemsOnlyChange(!e.target.checked)}
            className="rounded border-border"
          />
          Include inactive items
        </label>
        <Button type="button" className="sm:ml-auto" onClick={onReceiveClick}>
          Receive stock
        </Button>
      </div>
      <FilterChipBar chips={chips} onRemove={onRemoveChip} onReset={onResetFilters} />
    </div>
  );
}
