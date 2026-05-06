"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { billingService } from "@/services/billing.service";
import { financeService } from "@/services/finance.service";
import { ghsInputToMinor, minorToGhs, PAYER_LABEL } from "@/components/finance/finance-utils";
import { CHARGE_KIND_FALLBACK, CHARGE_KIND_ICON } from "@/components/billing/lib/billing-utils";
import type { ChargeInput } from "@/types/billing.types";
import type { ServiceCatalogDto, ServicePricingDto } from "@/types/finance.types";

export interface DraftCharge extends ChargeInput {
  /** Local row id — only used in the UI list. */
  rowId: string;
  /** Display label; cached from the picker. */
  displayName: string;
}

function makeRowId(): string {
  return `c-${Math.random().toString(36).slice(2, 10)}`;
}

export function ChargeBuilder({
  charges,
  onChange,
  defaultPayer,
}: {
  charges: DraftCharge[];
  onChange: (next: DraftCharge[]) => void;
  defaultPayer: string;
}) {
  const services = useQuery({
    queryKey: ["finance", "catalog", "services", "active"],
    queryFn: () => financeService.listServices(true),
  });
  const pricing = useQuery({
    queryKey: ["finance", "pricing", "matrix"],
    queryFn: () => financeService.listPricingMatrix(),
  });
  const kinds = useQuery({
    queryKey: ["billing", "charge-kinds"],
    queryFn: () => billingService.chargeKinds(),
  });

  const kindList = (kinds.data && kinds.data.length > 0) ? kinds.data : CHARGE_KIND_FALLBACK;

  // Form state for a new charge row to be appended.
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [serviceId, setServiceId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [customGroup, setCustomGroup] = useState<string>("OTHER");
  const [customCode, setCustomCode] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [payer, setPayer] = useState<string>(defaultPayer);
  const [unitOverride, setUnitOverride] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    setPayer(defaultPayer);
  }, [defaultPayer]);

  const selectedService = useMemo<ServiceCatalogDto | undefined>(
    () => (services.data ?? []).find((s) => s.id === serviceId),
    [services.data, serviceId],
  );

  const tariff = useMemo(() => lookupTariff(pricing.data ?? [], serviceId, payer), [pricing.data, serviceId, payer]);

  function addRow() {
    if (mode === "catalog") {
      if (!serviceId || !selectedService) return;
      const qty = Math.max(1, Number.parseFloat(quantity) || 1);
      const unitMinor = unitOverride.trim()
        ? Math.max(0, ghsInputToMinor(unitOverride))
        : tariff?.unitPriceMinor ?? 0;
      onChange([
        ...charges,
        {
          rowId: makeRowId(),
          serviceId,
          payerType: payer,
          quantity: qty,
          unitPriceMinorOverride: unitOverride.trim() ? unitMinor : null,
          discountMinor: 0,
          notes: notes.trim(),
          displayName: selectedService.serviceName,
        },
      ]);
    } else {
      if (!customName.trim() || !unitOverride.trim()) return;
      const qty = Math.max(1, Number.parseFloat(quantity) || 1);
      const unitMinor = Math.max(0, ghsInputToMinor(unitOverride));
      if (Number.isNaN(unitMinor)) return;
      onChange([
        ...charges,
        {
          rowId: makeRowId(),
          serviceId: null,
          customServiceCode: customCode.trim() || "AD-HOC",
          customServiceName: customName.trim(),
          customServiceGroup: customGroup,
          payerType: payer,
          quantity: qty,
          unitPriceMinorOverride: unitMinor,
          discountMinor: 0,
          notes: notes.trim(),
          displayName: customName.trim(),
        },
      ]);
    }
    // reset row form
    setServiceId("");
    setCustomName("");
    setCustomCode("");
    setQuantity("1");
    setUnitOverride("");
    setNotes("");
  }

  function removeRow(rowId: string) {
    onChange(charges.filter((c) => c.rowId !== rowId));
  }

  // Compute the total for the visible draft list.
  const total = charges.reduce((sum, c) => {
    const unit = c.unitPriceMinorOverride ?? tariffForCharge(pricing.data ?? [], c)?.unitPriceMinor ?? 0;
    return sum + unit * (c.quantity ?? 1);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              mode === "catalog" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
            onClick={() => setMode("catalog")}
          >
            From service catalog
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              mode === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
            onClick={() => setMode("custom")}
          >
            Custom / ad-hoc charge
          </button>
        </div>

        {mode === "catalog" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Service *">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a service from catalog…" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {(services.data ?? []).length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No services available. Set up the catalog under Finance → Services.
                    </div>
                  )}
                  {(services.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {CHARGE_KIND_ICON[s.serviceGroup] ?? "•"} {s.serviceName}{" "}
                      <span className="text-xs text-muted-foreground">· {s.serviceGroup}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payer for this line">
              <Select value={payer} onValueChange={setPayer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PAYER_LABEL).map((p) => (
                    <SelectItem key={p} value={p}>{PAYER_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="font-clinical"
              />
            </Field>
            <Field label="Unit price (override)">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-clinical">
                  {tariff
                    ? `Tariff: GH₵ ${minorToGhs(tariff.unitPriceMinor)}`
                    : selectedService
                    ? "No tariff for this payer"
                    : "Pick a service to see tariff"}
                </div>
                <Input
                  placeholder="GH₵"
                  value={unitOverride}
                  onChange={(e) => setUnitOverride(e.target.value)}
                  className="w-[140px] font-clinical"
                />
              </div>
            </Field>
            <Field label="Notes (optional)" className="md:col-span-2">
              <Textarea
                rows={1}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional clinical/billing context"
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Charge name *">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Surgical gloves (pair)"
              />
            </Field>
            <Field label="Charge kind *">
              <Select value={customGroup} onValueChange={setCustomGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindList.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {CHARGE_KIND_ICON[k.value] ?? "•"} {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Internal code (optional)">
              <Input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="AD-HOC"
              />
            </Field>
            <Field label="Payer">
              <Select value={payer} onValueChange={setPayer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PAYER_LABEL).map((p) => (
                    <SelectItem key={p} value={p}>{PAYER_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="font-clinical"
              />
            </Field>
            <Field label="Unit price (GH₵) *">
              <Input
                value={unitOverride}
                onChange={(e) => setUnitOverride(e.target.value)}
                placeholder="0.00"
                className="font-clinical"
              />
            </Field>
            <Field label="Notes (optional)" className="md:col-span-2">
              <Textarea
                rows={1}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was rendered? Any context for the cashier?"
              />
            </Field>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add charge to bill
          </Button>
        </div>
      </div>

      {charges.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Charge</Th>
                <Th>Kind</Th>
                <Th>Payer</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Unit</Th>
                <Th className="text-right">Total</Th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {charges.map((c) => {
                const tariffPrice = tariffForCharge(pricing.data ?? [], c)?.unitPriceMinor ?? 0;
                const unit = c.unitPriceMinorOverride ?? tariffPrice;
                const lineTotal = unit * (c.quantity ?? 1);
                const kind = c.serviceId
                  ? services.data?.find((s) => s.id === c.serviceId)?.serviceGroup ?? "OTHER"
                  : c.customServiceGroup ?? "OTHER";
                return (
                  <tr key={c.rowId}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.displayName}</p>
                      {c.notes && <p className="patient-id mt-0.5">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {CHARGE_KIND_ICON[kind] ?? "•"} {kind}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {PAYER_LABEL[c.payerType ?? ""] ?? c.payerType}
                    </td>
                    <td className="px-4 py-3 text-right font-clinical">{c.quantity ?? 1}</td>
                    <td className="px-4 py-3 text-right font-clinical">GH₵ {minorToGhs(unit)}</td>
                    <td className="px-4 py-3 text-right font-clinical font-semibold">GH₵ {minorToGhs(lineTotal)}</td>
                    <td className="px-2 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeRow(c.rowId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/40">
                <td colSpan={5} className="px-4 py-2.5 text-right text-sm font-medium">
                  Charges total
                </td>
                <td className="px-4 py-2.5 text-right font-clinical font-semibold">GH₵ {minorToGhs(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}

function lookupTariff(pricing: ServicePricingDto[], serviceId: string, payerType: string): ServicePricingDto | null {
  if (!serviceId) return null;
  const direct = pricing.find((p) => p.active && p.serviceId === serviceId && p.payerType === payerType);
  if (direct) return direct;
  const cash = pricing.find((p) => p.active && p.serviceId === serviceId && p.payerType === "CASH");
  return cash ?? null;
}

function tariffForCharge(pricing: ServicePricingDto[], c: DraftCharge): ServicePricingDto | null {
  if (!c.serviceId) return null;
  return lookupTariff(pricing, c.serviceId, c.payerType ?? "CASH");
}
