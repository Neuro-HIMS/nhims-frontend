"use client";

import { Loader2 } from "lucide-react";

import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PharmacyStockLotDto } from "@/types/pharmacy-inventory.types";

interface LotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string | null;
  loading: boolean;
  lots: PharmacyStockLotDto[];
  onAdjust: (lot: PharmacyStockLotDto) => void;
}

export function LotsDialog({ open, onOpenChange, itemLabel, loading, lots, onAdjust }: LotsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stock lots</DialogTitle>
          <DialogDescription>
            {itemLabel ? <>Batches for <span className="font-medium text-foreground">{itemLabel}</span>.</> : "—"}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading lots…
          </div>
        ) : (
          <div className="max-h-[min(60vh,420px)] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Batch
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Supplier
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Expiry
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No lots for this item yet.
                    </td>
                  </tr>
                ) : (
                  lots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium">{lot.batchNo || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{lot.supplierName || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-clinical font-medium">
                        {Number(lot.quantityOnHand)} {lot.unit}
                      </td>
                      <td className="px-3 py-2.5 font-clinical text-muted-foreground">
                        {lot.expiryDate ? formatDateTime(`${lot.expiryDate}T12:00:00`) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => onAdjust(lot)}>
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
