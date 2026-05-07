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
import type { PharmacyInventoryItemDto, PharmacySupplierDto } from "@/types/pharmacy-inventory.types";

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PharmacyInventoryItemDto[];
  suppliers: PharmacySupplierDto[];
  defaultItemId?: string | null;
  pending?: boolean;
  onSubmit: (payload: {
    itemId: string;
    supplierId?: string | null;
    batchNo?: string;
    expiryDate?: string | null;
    quantity: number;
    unit?: string;
    unitCostMinor?: number | null;
    referenceNote?: string;
  }) => Promise<void>;
}

export function ReceiveStockDialog({
  open,
  onOpenChange,
  items,
  suppliers,
  defaultItemId,
  pending,
  onSubmit,
}: ReceiveStockDialogProps) {
  const [itemId, setItemId] = useState("");
  const [supplierId, setSupplierId] = useState<string>("__none__");
  const [batchNo, setBatchNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("TABLET");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setItemId(defaultItemId ?? items[0]?.id ?? "");
    setSupplierId("__none__");
    setBatchNo("");
    setExpiry("");
    setQty("1");
    setUnit("TABLET");
    setCost("");
    setNote("");
  }, [open, defaultItemId, items]);

  async function save() {
    const q = Number.parseFloat(qty);
    if (!itemId || !Number.isFinite(q) || q <= 0) return;
    let unitCostMinor: number | null = null;
    if (cost.trim()) {
      const n = Number.parseFloat(cost);
      if (Number.isFinite(n)) unitCostMinor = Math.round(n * 100);
    }
    await onSubmit({
      itemId,
      supplierId: supplierId === "__none__" ? null : supplierId,
      batchNo: batchNo.trim() || undefined,
      expiryDate: expiry.trim() || null,
      quantity: q,
      unit: unit.trim() || "UNIT",
      unitCostMinor,
      referenceNote: note.trim() || undefined,
    });
    onOpenChange(false);
  }

  const activeSuppliers = suppliers.filter((s) => s.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1.5rem)] sm:max-w-5xl sm:w-full">
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
          <DialogDescription>Creates a new batch lot and posts a RECEIPT movement.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Inventory item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose item…" />
              </SelectTrigger>
              <SelectContent>
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Supplier (optional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {activeSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rcv-batch">Batch no.</Label>
              <Input id="rcv-batch" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcv-exp">Expiry</Label>
              <Input id="rcv-exp" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rcv-qty">Quantity</Label>
              <Input id="rcv-qty" className="font-clinical" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcv-unit">Unit</Label>
              <Input id="rcv-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="TABLET" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rcv-cost">Unit cost (GHS, optional)</Label>
            <Input id="rcv-cost" className="font-clinical" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rcv-note">Reference note</Label>
            <Textarea id="rcv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !itemId} onClick={() => void save()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Receive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
