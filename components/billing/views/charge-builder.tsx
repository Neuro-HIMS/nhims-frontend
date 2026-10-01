"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { CHARGE_KIND_FALLBACK } from "@/components/billing/lib/billing-utils";
import { MoneyInput } from "@/components/common/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchablePicker } from "@/components/common/searchable-picker";
import { chargeGroupLabel, formatMoney, parseMoney, PAYER, payerLabel } from "@/lib/billing";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import { financeService } from "@/services/finance.service";
import type { ChargeInput } from "@/types/billing.types";
import type { ServiceCatalogDto, ServicePricingDto } from "@/types/finance.types";

export interface DraftCharge extends ChargeInput {
  /** Local row id — only used in the UI list. */
  rowId: string;
  /** Display label; cached from the picker. */
  displayName: string;
}

const PAYER_CHOICES = Object.keys(PAYER).filter((p) => p !== "IGF");

function makeRowId(): string {
  return `c-${Math.random().toString(36).slice(2, 10)}`;
}

/** Builds the list of items for a new or existing bill (BIL-03 / BIL-04). */
export function ChargeBuilder({ charges, onChange, defaultPayer }: { charges: DraftCharge[]; onChange: (next: DraftCharge[]) => void; defaultPayer: string }) {
  const services = useQuery({
    queryKey: queryKeys.finance.activeServices,
    queryFn: () => financeService.listServices(true),
  });
  const pricing = useQuery({
    queryKey: queryKeys.finance.pricing,
    queryFn: () => financeService.listPricingMatrix(),
  });
  const kinds = useQuery({
    queryKey: queryKeys.billing.chargeKinds,
    queryFn: () => billingService.chargeKinds(),
  });
  const kindList = kinds.data && kinds.data.length > 0 ? kinds.data : CHARGE_KIND_FALLBACK;

  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [serviceId, setServiceId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("OTHER");
  const [customCode, setCustomCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  // The item's payer follows the bill's until the cashier picks one.
  const [payerChoice, setPayer] = useState<string | null>(null);
  const payer = payerChoice ?? defaultPayer;
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const selectedService = useMemo<ServiceCatalogDto | undefined>(() => (services.data ?? []).find((s) => s.id === serviceId), [services.data, serviceId]);
  const tariff = useMemo(() => lookupTariff(pricing.data ?? [], serviceId, payer), [pricing.data, serviceId, payer]);

  function addRow() {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) return setProblem("Enter a whole number of 1 or more.");
    const priceMinor = price.trim() ? parseMoney(price) : NaN;
    if (price.trim() && !Number.isFinite(priceMinor)) return setProblem("Enter the price like 12.50.");
    if (mode === "catalog") {
      if (!selectedService) return setProblem("Choose a service.");
      if (!tariff && !price.trim()) return setProblem("This service has no price for this payer. Enter the price.");
      onChange([
        ...charges,
        {
          rowId: makeRowId(),
          serviceId,
          payerType: payer,
          quantity: qty,
          unitPriceMinorOverride: price.trim() ? priceMinor : null,
          discountMinor: 0,
          notes: notes.trim(),
          displayName: selectedService.serviceName,
        },
      ]);
    } else {
      if (!customName.trim()) return setProblem("Say what the item is.");
      if (!price.trim() || !(priceMinor > 0)) return setProblem("Enter a price above 0.");
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
          unitPriceMinorOverride: priceMinor,
          discountMinor: 0,
          notes: notes.trim(),
          displayName: customName.trim(),
        },
      ]);
    }
    setProblem(null);
    setServiceId("");
    setCustomName("");
    setCustomCode("");
    setQuantity("1");
    setPrice("");
    setNotes("");
  }

  const total = charges.reduce((sum, c) => {
    const unit = c.unitPriceMinorOverride ?? tariffForCharge(pricing.data ?? [], c)?.unitPriceMinor ?? 0;
    return sum + unit * (c.quantity ?? 1);
  }, 0);

  const payerSelect = (
    <Select value={payer} onValueChange={setPayer}>
      <SelectTrigger id="cb-payer" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAYER_CHOICES.map((p) => (
          <SelectItem key={p} value={p}>
            {PAYER[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      {pricing.isError && <p className="text-xs text-destructive">Prices couldn&apos;t be loaded, so amounts below may show as 0.00. Close this and try again.</p>}
      <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4">
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "catalog" | "custom")} className="flex flex-wrap gap-2" aria-label="Where the item comes from">
          <ChoiceOption>
            <RadioGroupItem value="catalog" /> From the price list
          </ChoiceOption>
          <ChoiceOption>
            <RadioGroupItem value="custom" /> Something not on the price list
          </ChoiceOption>
        </RadioGroup>

        <div className="grid gap-3 md:grid-cols-2">
          {mode === "catalog" ? (
            <Field label="Service" htmlFor="cb-service">
              <SearchablePicker
                id="cb-service"
                value={serviceId}
                onChange={setServiceId}
                loading={services.isPending}
                placeholder="Choose a service"
                searchPlaceholder="Service name or code"
                emptyText={services.isError ? "The price list couldn't be loaded. Close this and try again." : "No service matches. Ask the finance officer to add it."}
                options={(services.data ?? []).map((s) => ({ value: s.id, label: s.serviceName, description: `${chargeGroupLabel(s.serviceGroup)} · ${s.serviceCode}`, keywords: s.serviceCode }))}
              />
            </Field>
          ) : (
            <>
              <Field label="What it is" htmlFor="cb-name">
                <Input id="cb-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Surgical gloves (pair)" />
              </Field>
              <Field label="Type" htmlFor="cb-type">
                <Select value={customGroup} onValueChange={setCustomGroup}>
                  <SelectTrigger id="cb-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kindList.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {chargeGroupLabel(k.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Code (optional)" htmlFor="cb-code">
                <Input id="cb-code" value={customCode} onChange={(e) => setCustomCode(e.target.value)} className="font-clinical" />
              </Field>
            </>
          )}
          <Field label="Who pays for this item" htmlFor="cb-payer">
            {payerSelect}
          </Field>
          <Field label="Quantity" htmlFor="cb-qty">
            <Input id="cb-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} className="font-clinical" />
          </Field>
          <Field label={mode === "catalog" ? "Price each (leave empty to use the price list)" : "Price each"} htmlFor="cb-price">
            <MoneyInput id="cb-price" value={price} onChange={setPrice} placeholder={tariff ? (tariff.unitPriceMinor / 100).toFixed(2) : "0.00"} />
            {mode === "catalog" && selectedService && (
              <p className="text-xs text-muted-foreground">{tariff ? `Price list: ${formatMoney(tariff.unitPriceMinor)}` : "No price for this payer — enter one."}</p>
            )}
          </Field>
          <Field label="Note (optional)" htmlFor="cb-notes" className="md:col-span-2">
            <Textarea id="cb-notes" rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Given on the ward" />
          </Field>
        </div>
        {problem && (
          <p role="alert" className="text-xs text-destructive">
            {problem}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" /> Add to the list
          </Button>
        </div>
      </div>

      {charges.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Who pays</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Price each</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {charges.map((c) => {
                const unit = c.unitPriceMinorOverride ?? tariffForCharge(pricing.data ?? [], c)?.unitPriceMinor ?? 0;
                const kind = c.serviceId ? (services.data?.find((s) => s.id === c.serviceId)?.serviceGroup ?? "OTHER") : (c.customServiceGroup ?? "OTHER");
                return (
                  <tr key={c.rowId}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{c.displayName}</p>
                      {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{chargeGroupLabel(kind)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{payerLabel(c.payerType)}</td>
                    <td className="px-4 py-2.5 text-right font-clinical">{c.quantity ?? 1}</td>
                    <td className="px-4 py-2.5 text-right font-clinical">{formatMoney(unit)}</td>
                    <td className="px-4 py-2.5 text-right font-clinical font-medium">{formatMoney(unit * (c.quantity ?? 1))}</td>
                    <td className="px-2 py-2.5 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Remove ${c.displayName}`} onClick={() => onChange(charges.filter((x) => x.rowId !== c.rowId))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-subtle">
                <td colSpan={5} className="px-4 py-2.5 text-right font-medium">
                  Total before NHIS
                </td>
                <td className="px-4 py-2.5 text-right font-clinical font-semibold">{formatMoney(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children, className = "" }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function latest(list: ServicePricingDto[]): ServicePricingDto | null {
  return [...list].sort((a, b) => (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""))[0] ?? null;
}

function lookupTariff(pricing: ServicePricingDto[], serviceId: string, payerType: string): ServicePricingDto | null {
  if (!serviceId) return null;
  const forService = pricing.filter((p) => p.active && p.serviceId === serviceId);
  return latest(forService.filter((p) => p.payerType === payerType)) ?? latest(forService.filter((p) => p.payerType === "CASH"));
}

function tariffForCharge(pricing: ServicePricingDto[], c: DraftCharge): ServicePricingDto | null {
  if (!c.serviceId) return null;
  return lookupTariff(pricing, c.serviceId, c.payerType ?? "CASH");
}
