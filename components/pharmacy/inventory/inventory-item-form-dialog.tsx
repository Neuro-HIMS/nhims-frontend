"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { queryKeys } from "@/lib/query-keys";
import { financeService } from "@/services/finance.service";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type { CreatePharmacyInventoryItemPayload } from "@/types/pharmacy-inventory.types";

interface InventoryItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  onSubmit: (payload: CreatePharmacyInventoryItemPayload) => Promise<void>;
}

export function InventoryItemFormDialog({ open, onOpenChange, pending, onSubmit }: InventoryItemFormDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [strength, setStrength] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [notes, setNotes] = useState("");
  const [catalogId, setCatalogId] = useState<string>("__none__");
  const [supplierId, setSupplierId] = useState<string>("__none__");

  const catalogQuery = useQuery({
    queryKey: ["finance", "catalog", "services", "pharmacy-picker"],
    queryFn: () => financeService.listServices(true),
    enabled: open,
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.suppliers("", "", "true"),
    queryFn: () => pharmacyInventoryService.listSuppliers({ active: true }),
    enabled: open,
  });

  const pharmacyCatalog = useMemo(() => {
    const rows = catalogQuery.data ?? [];
    return rows.filter((r) => String(r.serviceGroup).toUpperCase() === "PHARMACY");
  }, [catalogQuery.data]);

  useEffect(() => {
    if (!open) return;
    setDisplayName("");
    setSkuCode("");
    setDosageForm("");
    setStrength("");
    setReorderLevel("0");
    setNotes("");
    setCatalogId("__none__");
    setSupplierId("__none__");
  }, [open]);

  async function save() {
    const rl = Number.parseFloat(reorderLevel);
    await onSubmit({
      displayName: displayName.trim(),
      skuCode: skuCode.trim() || undefined,
      dosageForm: dosageForm.trim() || undefined,
      strength: strength.trim() || undefined,
      reorderLevel: Number.isFinite(rl) ? Math.max(0, rl) : 0,
      notes: notes.trim() || undefined,
      catalogServiceId: catalogId === "__none__" ? null : catalogId,
      defaultSupplierId: supplierId === "__none__" ? null : supplierId,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1.5rem)] sm:max-w-5xl sm:w-full">
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
          <DialogDescription>
            Logical shelf SKU for stock lots. Optionally link a billing catalog drug (PHARMACY group).
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[min(70vh,640px)] gap-x-6 gap-y-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="it-name">Display name *</Label>
            <Input id="it-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-sku">SKU code</Label>
            <Input id="it-sku" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-rl">Reorder level</Label>
            <Input
              id="it-rl"
              className="font-clinical"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-form">Dosage form</Label>
            <Input id="it-form" value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-str">Strength</Label>
            <Input id="it-str" value={strength} onChange={(e) => setStrength(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Billing catalog link</Label>
            <Select value={catalogId} onValueChange={setCatalogId}>
              <SelectTrigger>
                <SelectValue placeholder={catalogQuery.isLoading ? "Loading…" : "None"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {pharmacyCatalog.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.serviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {(suppliersQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="it-notes">Notes</Label>
            <Textarea id="it-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !displayName.trim()} onClick={() => void save()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
