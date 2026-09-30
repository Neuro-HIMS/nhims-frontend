"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, PackagePlus, Upload } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { AdjustStockDialog } from "@/components/pharmacy/inventory/adjust-stock-dialog";
import { ReceiveStockDialog } from "@/components/pharmacy/inventory/receive-stock-dialog";
import type { FilterChip } from "@/components/pharmacy/inventory/shared/filter-chip-bar";
import { ImportResultDialog } from "@/components/pharmacy/inventory/stock/import-result-dialog";
import { ImportStockDialog } from "@/components/pharmacy/inventory/stock/import-stock-dialog";
import { LotsDialog } from "@/components/pharmacy/inventory/stock/lots-dialog";
import { StockTable } from "@/components/pharmacy/inventory/stock/stock-table";
import { StockToolbar, type StockStatusFilter } from "@/components/pharmacy/inventory/stock/stock-toolbar";
import { Button } from "@/components/ui/button";
import { getFriendlyError } from "@/lib/api-errors";
import { hasExpiredStock, stockStatus } from "@/lib/pharmacy";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type { PharmacyStockLotDto, StockCsvImportResultDto } from "@/types/pharmacy-inventory.types";

/** PHA-06 — how much of each medicine is on the shelf. */
export function StockPage() {
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<StockCsvImportResultDto | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("ALL");
  const [activeItemsOnly, setActiveItemsOnly] = useState(true);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [defaultReceiveItemId, setDefaultReceiveItemId] = useState<string | null>(null);
  const [lotsItemId, setLotsItemId] = useState<string | null>(null);
  const [adjustLot, setAdjustLot] = useState<PharmacyStockLotDto | null>(null);

  const overviewQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.overview(String(activeItemsOnly)),
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
    enabled: Boolean(lotsItemId),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ lotId, quantity, direction, referenceNote }: { lotId: string; quantity: number; direction: "IN" | "OUT"; referenceNote?: string }) =>
      pharmacyInventoryService.adjustLot(lotId, { quantity, direction, referenceNote }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success("Stock adjusted.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const rows = useMemo(() => overviewQuery.data ?? [], [overviewQuery.data]);
  const counts = useMemo(
    () => ({
      LOW: rows.filter((r) => r.stockStatus === "LOW").length,
      OUT: rows.filter((r) => r.stockStatus === "OUT").length,
      EXPIRING_SOON: rows.filter((r) => r.stockStatus === "EXPIRING_SOON").length,
      EXPIRED: rows.filter((r) => hasExpiredStock(r.nearestExpiry)).length,
    }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.displayName.toLowerCase().includes(needle) && !(r.skuCode ?? "").toLowerCase().includes(needle)) return false;
      if (statusFilter === "EXPIRED") return hasExpiredStock(r.nearestExpiry);
      return statusFilter === "ALL" || r.stockStatus === statusFilter;
    });
  }, [rows, search, statusFilter]);

  const chips: FilterChip[] = [
    ...(search.trim() ? [{ id: "q", label: `Search: ${search.trim()}` }] : []),
    ...(statusFilter !== "ALL" ? [{ id: "status", label: `Showing: ${stockStatus(statusFilter).label}` }] : []),
    ...(!activeItemsOnly ? [{ id: "inactive", label: "Including switched-off medicines" }] : []),
  ];

  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setActiveItemsOnly(true);
  }

  function openReceive(itemId?: string) {
    setDefaultReceiveItemId(itemId ?? null);
    setReceiveOpen(true);
  }

  function receiveFinished(saved: number, failed: number) {
    void qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
    if (failed === 0) toast.success(saved === 1 ? "Stock received: 1 batch added." : `Stock received: ${saved} batches added.`);
    else toast.error(`${saved} added, ${failed} not added. The lines left in the form say why.`);
  }

  async function downloadStockList() {
    setDownloading(true);
    try {
      const blob = await pharmacyInventoryService.exportStockCsv(activeItemsOnly);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-list-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("The stock list couldn't be downloaded. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  const lotsLabel = lotsItemId ? (rows.find((r) => r.itemId === lotsItemId)?.displayName ?? null) : null;
  const noMedicines = !overviewQuery.isPending && !overviewQuery.isError && rows.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Stock</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">How much of each medicine is on the shelf, batch by batch.</p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void downloadStockList()} disabled={downloading || rows.length === 0}>
            {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            Download stock list
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={noMedicines}>
            <Upload className="mr-1.5 h-4 w-4" /> Import from spreadsheet
          </Button>
          <Button type="button" size="sm" onClick={() => openReceive()} disabled={noMedicines}>
            <PackagePlus className="mr-1.5 h-4 w-4" /> Receive stock
          </Button>
        </div>
      </div>

      {overviewQuery.isPending ? (
        <TableSkeleton rows={5} columns={6} />
      ) : overviewQuery.isError ? (
        <ErrorState error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />
      ) : noMedicines ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="empty-list"
            title="No medicines yet"
            description="Add the medicines the pharmacy keeps in the Medicines list, then receive stock for them here."
            action={{ label: "Go to the medicines list", href: "/pharmacy?view=inventory&tab=medicines" }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(["LOW", "OUT", "EXPIRING_SOON", "EXPIRED"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={statusFilter === k}
                onClick={() => setStatusFilter(statusFilter === k ? "ALL" : k)}
                className={cn(
                  "rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  statusFilter === k ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                <p className="stat-card-label">{k === "EXPIRING_SOON" ? "Expiring in 30 days" : stockStatus(k).label}</p>
                <p className={cn("stat-card-value", counts[k] > 0 && (k === "OUT" || k === "EXPIRED") && "text-destructive")}>{counts[k]}</p>
              </button>
            ))}
          </div>

          <StockToolbar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            activeItemsOnly={activeItemsOnly}
            onActiveItemsOnlyChange={setActiveItemsOnly}
            chips={chips}
            onRemoveChip={(id) => {
              if (id === "q") setSearch("");
              if (id === "status") setStatusFilter("ALL");
              if (id === "inactive") setActiveItemsOnly(true);
            }}
            onResetFilters={resetFilters}
          />

          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                illustration="no-results"
                title="Nothing matches these filters"
                description="Try another word or show everything."
                action={{ label: "Show everything", onClick: resetFilters }}
              />
            </div>
          ) : (
            <StockTable rows={filteredRows} onReceive={(id) => openReceive(id)} onViewLots={setLotsItemId} />
          )}
        </>
      )}

      <ReceiveStockDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        items={itemsQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        defaultItemId={defaultReceiveItemId}
        onReceiveLine={pharmacyInventoryService.receiveStock}
        onFinished={receiveFinished}
      />

      <ImportStockDialog open={importOpen} onOpenChange={setImportOpen} onImport={pharmacyInventoryService.importStockCsv} onImported={(r) => {
        void qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
        setImportResult(r);
      }} />
      <ImportResultDialog result={importResult} onOpenChange={(o) => !o && setImportResult(null)} />

      <LotsDialog
        open={lotsItemId !== null && adjustLot === null}
        onOpenChange={(o) => !o && setLotsItemId(null)}
        itemLabel={lotsLabel}
        loading={lotsQuery.isFetching}
        lots={(lotsQuery.data ?? []).filter((l) => !lotsItemId || l.itemId === lotsItemId)}
        onAdjust={setAdjustLot}
      />

      <AdjustStockDialog
        open={adjustLot !== null}
        onOpenChange={(o) => !o && setAdjustLot(null)}
        lot={adjustLot}
        pending={adjustMutation.isPending}
        onSubmit={async (lotId, quantity, direction, note) => {
          await adjustMutation.mutateAsync({ lotId, quantity, direction, referenceNote: note || undefined });
        }}
      />
    </div>
  );
}
