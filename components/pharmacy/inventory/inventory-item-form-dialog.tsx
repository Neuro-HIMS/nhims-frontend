"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type { CreatePharmacyInventoryItemPayload, PharmacyInventoryItemDto } from "@/types/pharmacy-inventory.types";

interface InventoryItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  /** Edit this medicine; omit to add a new one. */
  initial?: PharmacyInventoryItemDto | null;
  onSubmit: (payload: CreatePharmacyInventoryItemPayload) => Promise<void>;
}

/** PHA-09 — add or edit a medicine the pharmacy keeps in stock. */
export function InventoryItemFormDialog(props: InventoryItemFormDialogProps) {
  // Mounted only while open, so every open starts from the right values (no reset effect).
  if (!props.open) return null;
  return <Body {...props} />;
}

function Body({ open, onOpenChange, pending, initial, onSubmit }: InventoryItemFormDialogProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [skuCode, setSkuCode] = useState(initial?.skuCode ?? "");
  const [dosageForm, setDosageForm] = useState(initial?.dosageForm ?? "");
  const [strength, setStrength] = useState(initial?.strength ?? "");
  const [reorderLevel, setReorderLevel] = useState(initial ? String(Number(initial.reorderLevel) || 0) : "0");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [catalogId, setCatalogId] = useState<string>(initial?.catalogServiceId ?? "__none__");
  const [supplierId, setSupplierId] = useState<string>(initial?.defaultSupplierId ?? "__none__");

  const catalogQuery = useQuery({
    // The clinical catalog, not the finance one: pharmacy staff can't read finance settings.
    queryKey: ["clinical", "catalog", "PHARMACY"],
    queryFn: () => clinicalService.catalog("PHARMACY"),
  });
  const suppliersQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.suppliers("", "", "true"),
    queryFn: () => pharmacyInventoryService.listSuppliers({ active: true }),
  });
  const pharmacyCatalog = useMemo(
    () => (catalogQuery.data ?? []).filter((r) => String(r.serviceGroup).toUpperCase() === "PHARMACY"),
    [catalogQuery.data],
  );

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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={initial ? `Edit ${initial.displayName}` : "Add a medicine"}
      description="A medicine or supply the pharmacy keeps in stock. Link it to its price-list entry so doctors can prescribe it and it can be billed."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !displayName.trim()} onClick={() => void save()}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Add medicine"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="The medicine">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="it-name">Name</Label>
          <Input id="it-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Paracetamol 500 mg tablets" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="it-form">Form (optional)</Label>
          <Input id="it-form" value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} placeholder="e.g. Tablet" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="it-str">Strength (optional)</Label>
          <Input id="it-str" value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500 mg" />
        </div>
      </FormDialogSection>

      <FormDialogSection title="Stock control">
        <div className="space-y-1.5">
          <Label htmlFor="it-sku">Stock code (optional)</Label>
          <Input id="it-sku" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} className="font-clinical" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="it-rl">Reorder when stock falls to (optional)</Label>
          <Input id="it-rl" inputMode="numeric" className="font-clinical" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
        </div>
      </FormDialogSection>

      <FormDialogSection title="Price list and supplier">
        <div className="space-y-1.5">
          <Label htmlFor="it-catalog">Price-list entry</Label>
          <Select value={catalogId} onValueChange={setCatalogId}>
            <SelectTrigger id="it-catalog" className="w-full">
              <SelectValue placeholder={catalogQuery.isPending ? "Loading…" : "Not linked"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {pharmacyCatalog.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.serviceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Needed to give it from a prescription.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="it-supplier">Usual supplier (optional)</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger id="it-supplier" className="w-full">
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="it-notes">Notes (optional)</Label>
          <Textarea id="it-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </FormDialogSection>
    </FormDialog>
  );
}
