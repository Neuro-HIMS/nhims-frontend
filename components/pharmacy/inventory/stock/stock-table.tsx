"use client";

import { AlertTriangle, Package, ScanLine } from "lucide-react";

import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { Button } from "@/components/ui/button";
import type { StockOverviewRowDto, StockOverviewStatus } from "@/types/pharmacy-inventory.types";

interface StockTableProps {
  rows: StockOverviewRowDto[];
  onReceive: (itemId: string) => void;
  onViewLots: (itemId: string) => void;
}

function statusPill(status: StockOverviewStatus) {
  switch (status) {
    case "ADEQUATE":
      return <span className="status-pill text-xs status-pill-active">Adequate</span>;
    case "LOW":
      return (
        <span className="status-pill text-xs bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Low stock
        </span>
      );
    case "OUT":
      return <span className="status-pill text-xs status-pill-inactive">Out of stock</span>;
    case "EXPIRING_SOON":
      return (
        <span className="status-pill text-xs bg-muted text-foreground ring-1 ring-border">
          <ScanLine className="mr-1 inline h-3 w-3" />
          Expiring soon
        </span>
      );
    default:
      return null;
  }
}

export function StockTable({ rows, onReceive, onViewLots }: StockTableProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Medicine
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                SKU
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Form / Strength
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total qty
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nearest expiry
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No inventory rows yet — create items and receive stock.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.itemId} className="table-row-interactive hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {r.displayName}
                    </p>
                  </td>
                  <td className="px-4 py-3 patient-id">{r.skuCode || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[r.dosageForm, r.strength].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-clinical font-medium">{Number(r.totalQuantityOnHand)}</td>
                  <td className="px-4 py-3">{statusPill(r.stockStatus)}</td>
                  <td className="px-4 py-3 font-clinical text-muted-foreground">
                    {r.nearestExpiry ? formatDateTime(`${r.nearestExpiry}T00:00:00Z`) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => onReceive(r.itemId)}>
                        Receive
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => onViewLots(r.itemId)}>
                        Lots
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
