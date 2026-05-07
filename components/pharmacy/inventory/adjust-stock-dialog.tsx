"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PharmacyStockLotDto } from "@/types/pharmacy-inventory.types";

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: PharmacyStockLotDto | null;
  pending?: boolean;
  onSubmit: (lotId: string, quantity: number, direction: "IN" | "OUT", note: string) => Promise<void>;
}

export function AdjustStockDialog({ open, onOpenChange, lot, pending, onSubmit }: AdjustStockDialogProps) {
  const [qty, setQty] = useState("1");
  const [dir, setDir] = useState<"IN" | "OUT">("OUT");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setQty("1");
      setDir("OUT");
      setNote("");
    }
  }, [open, lot?.id]);

  async function save() {
    if (!lot) return;
    const q = Number.parseFloat(qty);
    if (!Number.isFinite(q) || q <= 0) return;
    await onSubmit(lot.id, q, dir, note.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock lot</DialogTitle>
          <DialogDescription>
            {lot ? (
              <>
                {lot.itemDisplayName} · batch {lot.batchNo || "—"} · on hand{" "}
                <span className="font-clinical font-medium">{Number(lot.quantityOnHand)}</span> {lot.unit}
              </>
            ) : (
              "Select a lot from the Lots dialog."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={dir} onValueChange={(v) => setDir(v as "IN" | "OUT")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OUT">Remove from shelf (OUT)</SelectItem>
                <SelectItem value="IN">Add to shelf (IN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-qty">Quantity</Label>
            <Input id="adj-qty" className="font-clinical" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-note">Note</Label>
            <Textarea id="adj-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!lot || pending} onClick={() => void save()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
