"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFriendlyError } from "@/lib/api-errors";
import type { PharmacyInventoryItemDto, PharmacySupplierDto, ReceiveStockPayload } from "@/types/pharmacy-inventory.types";

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PharmacyInventoryItemDto[];
  suppliers: PharmacySupplierDto[];
  defaultItemId?: string | null;
  /** Saves one batch. Called once per line. */
  onReceiveLine: (payload: ReceiveStockPayload) => Promise<unknown>;
  /** After the save run, with how many lines went in (some may have failed). */
  onFinished: (saved: number, failed: number) => void;
}

interface Line {
  key: number;
  itemId: string;
  batchNo: string;
  expiry: string;
  qty: string;
  unit: string;
  cost: string;
  error?: string;
}

let nextKey = 1;
const blankLine = (itemId = ""): Line => ({ key: nextKey++, itemId, batchNo: "", expiry: "", qty: "", unit: "", cost: "" });

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** What's wrong with a line, or null when it can be saved. */
function lineProblem(l: Line): string | null {
  if (!l.itemId) return "Choose the medicine.";
  const q = Number.parseFloat(l.qty);
  if (!Number.isFinite(q) || q <= 0) return "Enter how many arrived.";
  if (l.expiry && l.expiry < todayIso()) return "This batch has already expired.";
  if (l.cost.trim() && !Number.isFinite(Number.parseFloat(l.cost))) return "Cost must be a number.";
  return null;
}

/** PHA-07 — record a delivery: one supplier and invoice, one or more batches. */
export function ReceiveStockDialog(props: ReceiveStockDialogProps) {
  // Mounted only while open so each delivery starts from a clean form.
  if (!props.open) return null;
  return <Body {...props} />;
}

function Body({ open, onOpenChange, items, suppliers, defaultItemId, onReceiveLine, onFinished }: ReceiveStockDialogProps) {
  const [supplierId, setSupplierId] = useState<string>("__none__");
  const [invoice, setInvoice] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [blankLine(defaultItemId ?? "")]);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const activeSuppliers = suppliers.filter((s) => s.active);
  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p, error: undefined } : l)));

  async function save() {
    setTried(true);
    if (lines.some((l) => lineProblem(l))) return;
    setSaving(true);
    const note = invoice.trim() ? `Invoice ${invoice.trim()}` : undefined;
    const failed: Line[] = [];
    let saved = 0;
    // One call per line: the backend records one batch at a time.
    for (const l of lines) {
      const cost = l.cost.trim() ? Math.round(Number.parseFloat(l.cost) * 100) : null;
      try {
        await onReceiveLine({
          itemId: l.itemId,
          supplierId: supplierId === "__none__" ? null : supplierId,
          batchNo: l.batchNo.trim() || undefined,
          expiryDate: l.expiry || null,
          quantity: Number.parseFloat(l.qty),
          unit: l.unit.trim() || "UNIT",
          unitCostMinor: cost,
          referenceNote: note,
        });
        saved += 1;
      } catch (e) {
        failed.push({ ...l, error: getFriendlyError(e).message });
      }
    }
    setSaving(false);
    onFinished(saved, failed.length);
    if (failed.length === 0) onOpenChange(false);
    else setLines(failed); // Keep only what didn't go in, with the reason, so it can be fixed and tried again.
  }

  const totalLines = lines.length;

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      size="xl"
      title="Receive a delivery"
      description="Add a line for each batch that arrived. Each line is added to stock as its own batch."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {totalLines === 1 ? "Receive 1 batch" : `Receive ${totalLines} batches`}
          </Button>
        </>
      }
    >
      <FormDialogSection title="Delivery">
        <div className="space-y-1.5">
          <Label htmlFor="rcv-supplier">Supplier (optional)</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger id="rcv-supplier" className="w-full">
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
        <div className="space-y-1.5">
          <Label htmlFor="rcv-invoice">Invoice or delivery note number (optional)</Label>
          <Input id="rcv-invoice" className="font-clinical" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
        </div>
      </FormDialogSection>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-1.5">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What arrived</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, blankLine()])} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" /> Add a line
          </Button>
        </div>
        <ol className="space-y-3">
          {lines.map((l, i) => {
            const problem = l.error ?? (tried ? lineProblem(l) : null);
            return (
              <li key={l.key} className="rounded-lg border border-border p-3" aria-label={`Line ${i + 1}`}>
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label htmlFor={`rcv-item-${l.key}`}>Medicine</Label>
                    <Select value={l.itemId} onValueChange={(v) => patch(l.key, { itemId: v })}>
                      <SelectTrigger id={`rcv-item-${l.key}`} className="w-full">
                        <SelectValue placeholder="Choose…" />
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`rcv-batch-${l.key}`}>Batch number</Label>
                    <Input id={`rcv-batch-${l.key}`} className="font-clinical" value={l.batchNo} onChange={(e) => patch(l.key, { batchNo: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`rcv-exp-${l.key}`}>Expiry date</Label>
                    <Input id={`rcv-exp-${l.key}`} type="date" min={todayIso()} value={l.expiry} onChange={(e) => patch(l.key, { expiry: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`rcv-qty-${l.key}`}>Quantity</Label>
                    <Input id={`rcv-qty-${l.key}`} inputMode="decimal" className="font-clinical" value={l.qty} onChange={(e) => patch(l.key, { qty: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`rcv-unit-${l.key}`}>Unit</Label>
                    <Input id={`rcv-unit-${l.key}`} value={l.unit} onChange={(e) => patch(l.key, { unit: e.target.value })} placeholder="tablet" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`rcv-cost-${l.key}`}>Cost each, GH₵</Label>
                    <div className="flex gap-1">
                      <Input id={`rcv-cost-${l.key}`} inputMode="decimal" className="font-clinical" value={l.cost} onChange={(e) => patch(l.key, { cost: e.target.value })} placeholder="0.00" />
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove line ${i + 1}`}
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {problem && (
                  <p role="alert" className="mt-2 text-xs text-destructive">
                    {problem}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </FormDialog>
  );
}
