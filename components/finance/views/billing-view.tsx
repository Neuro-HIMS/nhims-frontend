"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeService } from "@/services/finance.service";
import type {
  BillDto,
  CreateBillItemPayload,
  ServiceCatalogDto,
  ServicePricingDto,
} from "@/types/finance.types";
import { ghsInputToMinor, minorToGhs, PAYER_LABEL, showApiError } from "@/components/finance/finance-utils";

interface DraftLine {
  serviceId: string;
  payerType: string;
  qty: string;
  unitPriceOverride: string;
}

export function BillingView() {
  const qc = useQueryClient();
  const services = useQuery({
    queryKey: ["finance", "catalog", "services", "active"],
    queryFn: () => financeService.listServices(true),
  });
  const pricing = useQuery({
    queryKey: ["finance", "pricing", "matrix"],
    queryFn: () => financeService.listPricingMatrix(),
  });
  const payers = useQuery({
    queryKey: ["finance", "catalog", "payers"],
    queryFn: () => financeService.payerTypes(),
  });
  const bills = useQuery({
    queryKey: ["finance", "bills"],
    queryFn: () => financeService.listBills(),
  });

  const [patientName, setPatientName] = useState("");
  const [patientPublicId, setPatientPublicId] = useState("");
  const [primaryPayer, setPrimaryPayer] = useState("CASH");
  const [secondaryPayer, setSecondaryPayer] = useState("CASH");
  const [nhisMemberNo, setNhisMemberNo] = useState("");
  const [insuranceCardNo, setInsuranceCardNo] = useState("");
  const [visitReference, setVisitReference] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { serviceId: "", payerType: "CASH", qty: "1", unitPriceOverride: "" },
  ]);

  const create = useMutation({
    mutationFn: financeService.createBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "bills"] });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      toast.success("Bill issued");
      setPatientName("");
      setPatientPublicId("");
      setNhisMemberNo("");
      setInsuranceCardNo("");
      setVisitReference("");
      setDiscount("");
      setNotes("");
      setLines([{ serviceId: "", payerType: primaryPayer, qty: "1", unitPriceOverride: "" }]);
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => financeService.cancelBill(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "bills"] });
      toast.success("Bill cancelled");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  function addLine() {
    setLines((prev) => [...prev, { serviceId: "", payerType: primaryPayer, qty: "1", unitPriceOverride: "" }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function patchLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const previewTotal = useMemo(() => {
    let subtotal = 0;
    let nhisCovered = 0;
    for (const ln of lines) {
      if (!ln.serviceId) continue;
      const qty = Number.parseFloat(ln.qty || "1") || 0;
      const override = ghsInputToMinor(ln.unitPriceOverride || "");
      const unit = !Number.isNaN(override)
        ? override
        : lookupTariff(pricing.data ?? [], ln.serviceId, ln.payerType);
      if (unit == null) continue;
      const line = unit * qty;
      subtotal += line;
      if (ln.payerType === "NHIS") nhisCovered += line;
    }
    const disc = ghsInputToMinor(discount || "0");
    const discMinor = Number.isNaN(disc) ? 0 : disc;
    const total = Math.max(0, subtotal - discMinor);
    const balance = Math.max(0, total - nhisCovered);
    return { subtotal, nhisCovered, total, balance };
  }, [lines, pricing.data, discount]);

  function submit() {
    if (!patientName.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (lines.every((l) => !l.serviceId)) {
      toast.error("Add at least one service line");
      return;
    }
    const items: CreateBillItemPayload[] = lines
      .filter((l) => l.serviceId)
      .map((l) => {
        const override = ghsInputToMinor(l.unitPriceOverride || "");
        return {
          serviceId: l.serviceId,
          payerType: l.payerType,
          quantity: Number.parseFloat(l.qty || "1") || 1,
          unitPriceMinorOverride: Number.isNaN(override) ? null : override,
          discountMinor: 0,
        };
      });

    const discountMinor = ghsInputToMinor(discount || "0");
    create.mutate({
      patientName: patientName.trim(),
      patientPublicId: patientPublicId.trim(),
      primaryPayer,
      secondaryPayer,
      nhisMemberNo: nhisMemberNo.trim(),
      insuranceCardNo: insuranceCardNo.trim(),
      visitReference: visitReference.trim(),
      discountMinor: Number.isNaN(discountMinor) ? 0 : discountMinor,
      notes: notes.trim(),
      items,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Issue a new bill</CardTitle>
          <CardDescription>
            Service names come from the master catalog dropdown so the same service is recorded identically across every bill,
            order, and report. NHIS lines auto-mark as covered against the patient's NHIS scheme; cash-out-of-pocket lines fall
            under IGF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            <Input placeholder="Patient ID (optional)" value={patientPublicId} onChange={(e) => setPatientPublicId(e.target.value)} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Primary payer</p>
              <Select value={primaryPayer} onValueChange={setPrimaryPayer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(payers.data ?? []).map((p) => (
                    <SelectItem key={p} value={p}>{PAYER_LABEL[p] ?? p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Secondary payer (out-of-pocket)</p>
              <Select value={secondaryPayer} onValueChange={setSecondaryPayer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(payers.data ?? []).map((p) => (
                    <SelectItem key={p} value={p}>{PAYER_LABEL[p] ?? p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="NHIS member number" value={nhisMemberNo} onChange={(e) => setNhisMemberNo(e.target.value)} />
            <Input placeholder="Insurance card no." value={insuranceCardNo} onChange={(e) => setInsuranceCardNo(e.target.value)} />
            <Input placeholder="Visit reference (OPD/IPD)" value={visitReference} onChange={(e) => setVisitReference(e.target.value)} />
            <Input placeholder="Bill-level discount (GH₵)" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Payer</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Unit (GH₵)</th>
                  <th className="px-3 py-2 font-medium text-right">Auto unit</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((ln, idx) => (
                  <BillingLineRow
                    key={idx}
                    services={services.data ?? []}
                    pricing={pricing.data ?? []}
                    payers={payers.data ?? []}
                    line={ln}
                    onPatch={(patch) => patchLine(idx, patch)}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" /> Add line
            </Button>
            <div className="text-sm">
              <p>Subtotal: <span className="font-clinical">GH₵ {minorToGhs(previewTotal.subtotal)}</span></p>
              <p>NHIS covered: <span className="font-clinical">GH₵ {minorToGhs(previewTotal.nhisCovered)}</span></p>
              <p className="font-medium">Patient pays: <span className="font-clinical">GH₵ {minorToGhs(previewTotal.balance)}</span></p>
            </div>
          </div>

          <Textarea placeholder="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Issue bill
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent bills</CardTitle>
          <CardDescription>Latest 100. Cancel re-routes to the IGF/NHIS write-off ledger.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {bills.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}
          {(bills.data ?? []).map((b: BillDto) => (
            <div key={b.id} className="rounded-md border border-border p-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs">{b.billNumber}</p>
                <span className="text-xs text-muted-foreground">{b.status}</span>
              </div>
              <p className="font-medium">{b.patientName || "—"}</p>
              <p className="text-xs text-muted-foreground">
                Total GH₵ {minorToGhs(b.totalMinor)} · Balance GH₵ {minorToGhs(b.balanceMinor)}
              </p>
              <p className="text-xs text-muted-foreground">
                {(PAYER_LABEL[b.primaryPayer as string] ?? b.primaryPayer)} · {b.items.length} lines
              </p>
              {b.status !== "PAID" && b.status !== "CANCELLED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  onClick={() => {
                    const reason = window.prompt("Cancellation reason?") ?? "";
                    if (!reason) return;
                    cancel.mutate({ id: b.id, reason });
                  }}
                >
                  Cancel bill
                </Button>
              )}
            </div>
          ))}
          {(bills.data ?? []).length === 0 && !bills.isLoading && (
            <p className="text-sm text-muted-foreground">No bills yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BillingLineRow({
  services,
  pricing,
  payers,
  line,
  onPatch,
  onRemove,
}: {
  services: ServiceCatalogDto[];
  pricing: ServicePricingDto[];
  payers: string[];
  line: DraftLine;
  onPatch: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
}) {
  const tariff = lookupTariff(pricing, line.serviceId, line.payerType);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">
        <Select value={line.serviceId} onValueChange={(v) => onPatch({ serviceId: v })}>
          <SelectTrigger className="h-9 w-[280px]">
            <SelectValue placeholder="Pick service…" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.serviceName} <span className="text-xs text-muted-foreground">· {s.serviceGroup}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select value={line.payerType} onValueChange={(v) => onPatch({ payerType: v })}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {payers.map((p) => (
              <SelectItem key={p} value={p}>{PAYER_LABEL[p] ?? p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 text-right">
        <Input
          className="h-9 w-[80px] text-right"
          value={line.qty}
          onChange={(e) => onPatch({ qty: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <Input
          className="h-9 w-[100px] text-right"
          value={line.unitPriceOverride}
          placeholder="auto"
          onChange={(e) => onPatch({ unitPriceOverride: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
        {tariff == null ? "—" : minorToGhs(tariff)}
      </td>
      <td className="px-3 py-2 text-right">
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function lookupTariff(
  pricing: ServicePricingDto[],
  serviceId: string,
  payerType: string,
): number | null {
  if (!serviceId) return null;
  const direct = pricing.find(
    (p) => p.active && p.serviceId === serviceId && p.payerType === payerType,
  );
  if (direct) return direct.unitPriceMinor;
  // fallback to CASH so IGF/CASH lines always preview a price
  const cash = pricing.find((p) => p.active && p.serviceId === serviceId && p.payerType === "CASH");
  return cash ? cash.unitPriceMinor : null;
}
