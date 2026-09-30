"use client";

import { Search } from "lucide-react";

import { FilterChipBar, type FilterChip } from "@/components/pharmacy/inventory/shared/filter-chip-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { StockOverviewStatus } from "@/types/pharmacy-inventory.types";

export type StockStatusFilter = StockOverviewStatus | "EXPIRED" | "ALL";

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
}: StockToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search stock" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Medicine or stock code" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StockStatusFilter)}>
          <SelectTrigger aria-label="Show" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Everything</SelectItem>
            <SelectItem value="ADEQUATE">In stock</SelectItem>
            <SelectItem value="LOW">Low stock</SelectItem>
            <SelectItem value="OUT">Out of stock</SelectItem>
            <SelectItem value="EXPIRING_SOON">Expiring soon</SelectItem>
            <SelectItem value="EXPIRED">Has expired stock</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="stock-show-off" checked={!activeItemsOnly} onCheckedChange={(c) => onActiveItemsOnlyChange(!c)} />
          <Label htmlFor="stock-show-off" className="text-sm font-normal">
            Show switched-off medicines
          </Label>
        </div>
      </div>
      <FilterChipBar chips={chips} onRemove={onRemoveChip} onReset={onResetFilters} />
    </div>
  );
}
