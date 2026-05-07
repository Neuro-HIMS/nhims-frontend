"use client";

import { Search } from "lucide-react";

import { FilterChipBar, type FilterChip } from "@/components/pharmacy/inventory/shared/filter-chip-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SupplierStatusFilter = "all" | "active" | "inactive";

interface SupplierToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  country: string;
  onCountryChange: (v: string) => void;
  countryOptions: string[];
  status: SupplierStatusFilter;
  onStatusChange: (v: SupplierStatusFilter) => void;
  chips: FilterChip[];
  onRemoveChip: (id: string) => void;
  onResetFilters: () => void;
}

export function SupplierToolbar({
  search,
  onSearchChange,
  country,
  onCountryChange,
  countryOptions,
  status,
  onStatusChange,
  chips,
  onRemoveChip,
  onResetFilters,
}: SupplierToolbarProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <FilterChipBar chips={chips} onRemove={onRemoveChip} onReset={onResetFilters} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="sup-filter-search" className="text-xs font-medium text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="sup-filter-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Name, contact, email…"
              className="pl-9 font-clinical"
            />
          </div>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[320px] lg:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Country</Label>
            <Select value={country || "__ALL__"} onValueChange={(v) => onCountryChange(v === "__ALL__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All countries</SelectItem>
                {countryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => onStatusChange(v as SupplierStatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
