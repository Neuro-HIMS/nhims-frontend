"use client";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { formatClinicalDate } from "@/lib/dates";
import { hasExpiredStock, stockStatus } from "@/lib/pharmacy";
import type { StockOverviewRowDto } from "@/types/pharmacy-inventory.types";

interface StockTableProps {
  rows: StockOverviewRowDto[];
  onReceive: (itemId: string) => void;
  onViewLots: (itemId: string) => void;
}

const TH = "px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase";

export function StockTable({ rows, onReceive, onViewLots }: StockTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-subtle text-left">
            <th className={TH}>Medicine</th>
            <th className={`${TH} text-right`}>Quantity</th>
            <th className={`${TH} text-right`}>Reorder at</th>
            <th className={TH}>Status</th>
            <th className={TH}>Earliest expiry</th>
            <th className={TH}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const s = stockStatus(r.stockStatus);
            const expired = hasExpiredStock(r.nearestExpiry);
            return (
              <tr key={r.itemId} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{r.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[r.dosageForm, r.strength, r.skuCode].filter(Boolean).join(" · ") || "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-clinical font-medium">{Number(r.totalQuantityOnHand)}</td>
                <td className="px-4 py-3 text-right font-clinical text-muted-foreground">{Number(r.reorderLevel) || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <StatusPill tone={s.tone}>{s.label}</StatusPill>
                    {expired && <StatusPill tone="error">Has expired stock</StatusPill>}
                  </div>
                </td>
                <td className={`px-4 py-3 font-clinical ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                  {r.nearestExpiry ? formatClinicalDate(r.nearestExpiry.slice(0, 10)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => onViewLots(r.itemId)} aria-label={`See batches of ${r.displayName}`}>
                      See batches
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onReceive(r.itemId)} aria-label={`Receive stock of ${r.displayName}`}>
                      Receive
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
