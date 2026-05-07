"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdjustStockDialog } from "@/components/pharmacy/inventory/adjust-stock-dialog";
import { InventoryItemFormDialog } from "@/components/pharmacy/inventory/inventory-item-form-dialog";
import { ReceiveStockDialog } from "@/components/pharmacy/inventory/receive-stock-dialog";
import { InventoryPageHeader } from "@/components/pharmacy/inventory/shared/inventory-page-header";
import type { FilterChip } from "@/components/pharmacy/inventory/shared/filter-chip-bar";
import { LotsDialog } from "@/components/pharmacy/inventory/stock/lots-dialog";
import { StockTable } from "@/components/pharmacy/inventory/stock/stock-table";
import { StockToolbar, type StockStatusFilter } from "@/components/pharmacy/inventory/stock/stock-toolbar";
import { queryKeys } from "@/lib/query-keys";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type {
  CreatePharmacyInventoryItemPayload,
  PharmacyStockLotDto,
  StockOverviewRowDto,
} from "@/types/pharmacy-inventory.types";

export function StockPage() {
  const qc = useQueryClient();
  const stockCsvInputRef = useRef<HTMLInputElement>(null);
  const [stockCsvBusy, setStockCsvBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("ALL");
  const [activeItemsOnly, setActiveItemsOnly] = useState(true);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [defaultReceiveItemId, setDefaultReceiveItemId] = useState<string | null>(null);
  const [lotsOpen, setLotsOpen] = useState(false);
  const [lotsItemId, setLotsItemId] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustLot, setAdjustLot] = useState<PharmacyStockLotDto | null>(null);

  const overviewKey = queryKeys.pharmacyInventory.overview(String(activeItemsOnly));
  const overviewQuery = useQuery({
    queryKey: overviewKey,
    queryFn: () => pharmacyInventoryService.stockOverview(activeItemsOnly),
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.items("true"),
    queryFn: () => pharmacyInventoryService.listInventoryItems(true),
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.suppliers("", "", "true"),
    queryFn: () => pharmacyInventoryService.listSuppliers({ active: true }),
  });

  const lotsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.lots(lotsItemId ?? ""),
    queryFn: () => pharmacyInventoryService.listLots(lotsItemId ?? undefined),
    enabled: lotsOpen && !!lotsItemId,
  });

  const receiveMutation = useMutation({
    mutationFn: pharmacyInventoryService.receiveStock,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success("Stock received");
    },
    onError: () => toast.error("Receive failed"),
  });

  const createItemMutation = useMutation({
    mutationFn: pharmacyInventoryService.createInventoryItem,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success("Inventory item created");
    },
    onError: () => toast.error("Could not create item"),
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      lotId,
      quantity,
      direction,
      referenceNote,
    }: {
      lotId: string;
      quantity: number;
      direction: "IN" | "OUT";
      referenceNote?: string;
    }) => pharmacyInventoryService.adjustLot(lotId, { quantity, direction, referenceNote }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success("Adjustment recorded");
    },
    onError: () => toast.error("Adjustment failed"),
  });

  const filteredRows = useMemo(() => {
    let rows: StockOverviewRowDto[] = overviewQuery.data ?? [];
    const needle = search.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (r) =>
          r.displayName.toLowerCase().includes(needle) ||
          (r.skuCode ?? "").toLowerCase().includes(needle) ||
          (r.dosageForm ?? "").toLowerCase().includes(needle),
      );
    }
    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.stockStatus === statusFilter);
    }
    return rows;
  }, [overviewQuery.data, search, statusFilter]);

  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = [];
    if (search.trim()) out.push({ id: "q", label: `Search: ${search.trim()}` });
    if (statusFilter !== "ALL") out.push({ id: "status", label: `Status: ${statusFilter.replace(/_/g, " ").toLowerCase()}` });
    if (!activeItemsOnly) out.push({ id: "inactive", label: "Including inactive items" });
    return out;
  }, [search, statusFilter, activeItemsOnly]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setActiveItemsOnly(true);
  }

  function removeChip(id: string) {
    if (id === "q") setSearch("");
    if (id === "status") setStatusFilter("ALL");
    if (id === "inactive") setActiveItemsOnly(true);
  }

  const lotsLabel = useMemo(() => {
    if (!lotsItemId) return null;
    return overviewQuery.data?.find((r) => r.itemId === lotsItemId)?.displayName ?? null;
  }, [lotsItemId, overviewQuery.data]);

  function openLots(itemId: string) {
    setLotsItemId(itemId);
    setLotsOpen(true);
  }

  function openReceive(itemId?: string) {
    setDefaultReceiveItemId(itemId ?? null);
    setReceiveOpen(true);
  }

  async function handleExportStockCsv() {
    setStockCsvBusy(true);
    try {
      const blob = await pharmacyInventoryService.exportStockCsv(activeItemsOnly);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pharmacy-stock-lots-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Stock exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setStockCsvBusy(false);
    }
  }

  async function handleStockCsvSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStockCsvBusy(true);
    try {
      const result = await pharmacyInventoryService.importStockCsv(file);
      await qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success(`Imported ${result.imported} receipt row(s); skipped ${result.skipped}`);
      if (result.errors.length > 0) {
        toast.warning(`Import issues (${result.errors.length})`, {
          description: result.errors.slice(0, 8).join(" · "),
          duration: 12000,
        });
      }
    } catch {
      toast.error("Import failed — check CSV headers and item SKU codes.");
    } finally {
      setStockCsvBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={stockCsvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleStockCsvSelected(e)}
      />

      <InventoryPageHeader
        title="Stock overview"
        description="Shelf quantities by inventory item, receipt batches, and adjustments. Export downloads one row per stock lot; import creates new receipt lots from CSV (sku_code or display_name plus quantity)."
        onAdd={() => setCreateItemOpen(true)}
        addLabel="Add item"
        onImportStockCsv={() => stockCsvInputRef.current?.click()}
        onExportStockCsv={handleExportStockCsv}
        stockCsvBusy={stockCsvBusy}
      />

      <StockToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        activeItemsOnly={activeItemsOnly}
        onActiveItemsOnlyChange={setActiveItemsOnly}
        chips={chips}
        onRemoveChip={removeChip}
        onResetFilters={resetFilters}
        onReceiveClick={() => openReceive()}
      />

      {overviewQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading stock overview…
        </div>
      ) : (
        <StockTable rows={filteredRows} onReceive={(id) => openReceive(id)} onViewLots={openLots} />
      )}

      <InventoryItemFormDialog
        open={createItemOpen}
        onOpenChange={setCreateItemOpen}
        pending={createItemMutation.isPending}
        onSubmit={async (payload: CreatePharmacyInventoryItemPayload) => {
          await createItemMutation.mutateAsync(payload);
        }}
      />

      <ReceiveStockDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        items={itemsQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        defaultItemId={defaultReceiveItemId}
        pending={receiveMutation.isPending}
        onSubmit={async (payload) => {
          await receiveMutation.mutateAsync(payload);
        }}
      />

      <LotsDialog
        open={lotsOpen}
        onOpenChange={(o) => {
          setLotsOpen(o);
          if (!o) setLotsItemId(null);
        }}
        itemLabel={lotsLabel}
        loading={lotsQuery.isFetching}
        lots={(lotsQuery.data ?? []).filter((l) => !lotsItemId || l.itemId === lotsItemId)}
        onAdjust={(lot) => {
          setAdjustLot(lot);
          setAdjustOpen(true);
        }}
      />

      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={(o) => {
          setAdjustOpen(o);
          if (!o) setAdjustLot(null);
        }}
        lot={adjustLot}
        pending={adjustMutation.isPending}
        onSubmit={async (lotId, quantity, direction, note) => {
          await adjustMutation.mutateAsync({ lotId, quantity, direction, referenceNote: note || undefined });
          void lotsQuery.refetch();
        }}
      />
    </div>
  );
}
