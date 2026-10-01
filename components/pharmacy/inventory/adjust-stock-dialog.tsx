"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { PharmacyStockLotDto } from "@/types/pharmacy-inventory.types";

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: PharmacyStockLotDto | null;
  pending?: boolean;
  onSubmit: (lotId: string, quantity: number, direction: "IN" | "OUT", note: string) => Promise<void>;
}

/** PHA-08 reasons. Stored at the start of the movement note so the movements list shows why. */
const REASONS: Record<"IN" | "OUT", string[]> = {
  OUT: ["Expired", "Damaged or spoilt", "Stock count correction", "Sent to another store", "Other"],
  IN: ["Stock count correction", "Returned by a patient", "Received from another store", "Other"],
};

/** PHA-08 — add to or remove from one batch, with a reason and a check before saving. */
export function AdjustStockDialog(props: AdjustStockDialogProps) {
  // Mounted only while open so each batch starts from a clean form.
  if (!props.open) return null;
  return <Body key={props.lot?.id ?? "none"} {...props} />;
}

function Body({ open, onOpenChange, lot, pending, onSubmit }: AdjustStockDialogProps) {
  const [dir, setDir] = useState<"IN" | "OUT">("OUT");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [checking, setChecking] = useState(false);

  const onHand = Number(lot?.quantityOnHand ?? 0);
  const unit = lot?.unit && lot.unit.toUpperCase() !== "UNIT" ? lot.unit : "units";
  const q = Number.parseFloat(qty);
  const qtyError =
    qty.trim() === ""
      ? null
      : !Number.isFinite(q) || q <= 0
        ? "Enter a number above 0."
        : dir === "OUT" && q > onHand
          ? `Only ${onHand} ${unit} in this batch.`
          : null;
  const detailsNeeded = reason === "Other";
  const ready = Boolean(lot) && qty.trim() !== "" && !qtyError && reason !== "" && (!detailsNeeded || details.trim() !== "");
  const after = dir === "OUT" ? onHand - q : onHand + q;
  const note = [reason, details.trim()].filter(Boolean).join(" — ");

  async function save() {
    if (!lot || !ready) return;
    await onSubmit(lot.id, q, dir, note);
    onOpenChange(false);
  }

  const title = checking ? (dir === "OUT" ? "Remove this stock?" : "Add this stock?") : "Adjust stock";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={title}
      description={
        lot ? (
          <>
            {lot.itemDisplayName} · batch {lot.batchNo || "—"} · in stock{" "}
            <span className="font-clinical font-medium">{onHand}</span> {unit}
          </>
        ) : (
          "Choose a batch first."
        )
      }
      footer={
        checking ? (
          <>
            <Button type="button" variant="outline" onClick={() => setChecking(false)} disabled={pending}>
              Go back
            </Button>
            <Button type="button" variant={dir === "OUT" ? "destructive" : "default"} disabled={pending} onClick={() => void save()}>
              {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {dir === "OUT" ? `Yes, remove ${q} ${unit}` : `Yes, add ${q} ${unit}`}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!ready} onClick={() => setChecking(true)}>
              Continue
            </Button>
          </>
        )
      }
    >
      {checking ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-subtle p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Now</p>
              <p className="font-clinical text-lg font-semibold">{onHand}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{dir === "OUT" ? "Remove" : "Add"}</p>
              <p className="font-clinical text-lg font-semibold">
                {dir === "OUT" ? "−" : "+"}
                {q}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">After</p>
              <p className="font-clinical text-lg font-semibold">{after}</p>
            </div>
          </div>
          <p>
            <span className="text-muted-foreground">Reason:</span> {note}
          </p>
          <p className="text-muted-foreground">This is recorded under your name in the stock movements list.</p>
        </div>
      ) : (
        <FormDialogSection>
          <div className="space-y-1.5 sm:col-span-2">
            <Label id="adj-dir-label">Add or remove</Label>
            <RadioGroup
              aria-labelledby="adj-dir-label"
              value={dir}
              onValueChange={(v) => {
                setDir(v as "IN" | "OUT");
                setReason("");
              }}
              className="flex flex-wrap gap-4"
            >
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="OUT" /> Remove from stock
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="IN" /> Add to stock
              </Label>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">Quantity ({unit})</Label>
            <Input
              id="adj-qty"
              inputMode="decimal"
              className="font-clinical"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-invalid={Boolean(qtyError)}
              aria-describedby={qtyError ? "adj-qty-error" : undefined}
            />
            {qtyError && (
              <p id="adj-qty-error" className="text-xs text-destructive">
                {qtyError}
              </p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label id="adj-reason-label">Reason</Label>
            <RadioGroup aria-labelledby="adj-reason-label" value={reason} onValueChange={setReason} className="grid gap-2 sm:grid-cols-2">
              {REASONS[dir].map((r) => (
                <Label key={r} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 font-normal">
                  <RadioGroupItem value={r} /> {r}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="adj-note">{detailsNeeded ? "Say what happened" : "More detail (optional)"}</Label>
            <Textarea id="adj-note" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Count on 30 Sep found 5 fewer" />
          </div>
        </FormDialogSection>
      )}
    </FormDialog>
  );
}
