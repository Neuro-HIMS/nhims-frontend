"use client";

import { Loader2 } from "lucide-react";

import { formatClinicalDate } from "@/lib/dates";
import { hasExpiredStock } from "@/lib/pharmacy";
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
          <DialogTitle>Batches</DialogTitle>
          <DialogDescription>
            {itemLabel ? <>Every batch of <span className="font-medium text-foreground">{itemLabel}</span>, earliest expiry first. Expired batches can&apos;t be given to patients: remove them with Adjust.</> : "—"}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading batches…
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
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Expiry
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No batches received yet.
                    </td>
                  </tr>
                ) : (
                  [...lots].sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999")).map((lot) => (
                    <tr key={lot.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium">{lot.batchNo || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{lot.supplierName || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-clinical font-medium">
                        {Number(lot.quantityOnHand)} {lot.unit}
                      </td>
                      <td className={`px-3 py-2.5 font-clinical ${hasExpiredStock(lot.expiryDate) ? "text-destructive" : "text-muted-foreground"}`}>
                        {lot.expiryDate ? formatClinicalDate(lot.expiryDate.slice(0, 10)) : "—"}
                        {hasExpiredStock(lot.expiryDate) && <span className="ml-1 font-sans text-xs">(expired)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => onAdjust(lot)} aria-label={`Adjust batch ${lot.batchNo || ""}`}>
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
