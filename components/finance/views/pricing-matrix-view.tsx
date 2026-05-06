"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeService } from "@/services/finance.service";
import type { ServiceCatalogDto, ServicePricingDto } from "@/types/finance.types";
import { ghsInputToMinor, minorToGhs, PAYER_LABEL, showApiError } from "@/components/finance/finance-utils";

export function PricingMatrixView() {
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

  const [serviceId, setServiceId] = useState<string>("");
  const [payerType, setPayerType] = useState<string>("CASH");
  const [payerLabel, setPayerLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [filterPayer, setFilterPayer] = useState<string>("ALL");
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredRows = useMemo(() => {
    const all = pricing.data ?? [];
    return filterPayer === "ALL" ? all : all.filter((r) => r.payerType === filterPayer);
  }, [pricing.data, filterPayer]);

  const grouped = useMemo(() => {
    const m = new Map<string, { service: ServiceCatalogDto; rows: ServicePricingDto[] }>();
    for (const r of filteredRows) {
      let entry = m.get(r.serviceId);
      if (!entry) {
        const s = (services.data ?? []).find((x) => x.id === r.serviceId);
        if (!s) continue;
        entry = { service: s, rows: [] };
        m.set(r.serviceId, entry);
      }
      entry.rows.push(r);
    }
    return Array.from(m.values()).sort((a, b) => a.service.serviceName.localeCompare(b.service.serviceName));
  }, [filteredRows, services.data]);

  const addMut = useMutation({
    mutationFn: financeService.addPricing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "pricing", "matrix"] });
      toast.success("Tariff saved");
      setAmount("");
      setPayerLabel("");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  const editMut = useMutation({
    mutationFn: (input: { id: string; payload: Parameters<typeof financeService.updatePricing>[1] }) =>
      financeService.updatePricing(input.id, input.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "pricing", "matrix"] });
      toast.success("Tariff updated");
      setEditId(null);
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  function submitAdd() {
    const minor = ghsInputToMinor(amount);
    if (!serviceId || Number.isNaN(minor)) {
      toast.error("Pick a service and enter a valid GHS amount");
      return;
    }
    addMut.mutate({
      serviceId,
      payerType,
      payerLabel: payerLabel.trim(),
      unitPriceMinor: minor,
      currency: "GHS",
      effectiveFrom: effectiveFrom.trim() || undefined,
      active: true,
    });
  }

  function startEdit(row: ServicePricingDto) {
    setEditId(row.id);
    setEditAmount(String(row.unitPriceMinor / 100));
    setEditLabel(row.payerLabel);
    setEditActive(row.active);
  }

  function submitEdit(row: ServicePricingDto) {
    if (!editId) return;
    const minor = ghsInputToMinor(editAmount);
    if (Number.isNaN(minor)) {
      toast.error("Enter a valid GHS amount");
      return;
    }
    editMut.mutate({
      id: editId,
      payload: {
        serviceId: row.serviceId,
        payerType: row.payerType as string,
        payerLabel: editLabel.trim(),
        unitPriceMinor: minor,
        currency: row.currency,
        active: editActive,
      },
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pricing matrix</CardTitle>
          <CardDescription>
            One tariff per (service, payer). NHIS rows reflect the NHIA reimbursable; CASH/IGF rows are charged out-of-pocket.
            Private insurer or corporate scheme tariffs use the corresponding payer rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterPayer} onValueChange={setFilterPayer}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All payers</SelectItem>
                {(payers.data ?? []).map((p) => (
                  <SelectItem key={p} value={p}>{PAYER_LABEL[p] ?? p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pricing.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tariffs…
            </p>
          )}

          <div className="space-y-3">
            {grouped.map(({ service, rows }) => (
              <div key={service.id} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium">{service.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{service.serviceCode} · {service.serviceGroup}</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Payer</th>
                        <th className="px-3 py-2 font-medium">Label</th>
                        <th className="px-3 py-2 font-medium text-right">Price (GH₵)</th>
                        <th className="px-3 py-2 font-medium">Active</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) =>
                        editId === r.id ? (
                          <tr key={r.id} className="bg-muted/30">
                            <td className="px-3 py-2">{PAYER_LABEL[r.payerType] ?? r.payerType}</td>
                            <td className="px-3 py-2">
                              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="text-right"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={editActive ? "yes" : "no"}
                                onValueChange={(v) => setEditActive(v === "yes")}
                              >
                                <SelectTrigger className="h-8 w-[110px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Active</SelectItem>
                                  <SelectItem value="no">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => submitEdit(r)} disabled={editMut.isPending}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={r.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">{PAYER_LABEL[r.payerType] ?? r.payerType}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.payerLabel || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{minorToGhs(r.unitPriceMinor)}</td>
                            <td className="px-3 py-2">{r.active ? "Yes" : "No"}</td>
                            <td className="px-3 py-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                                <PencilLine className="mr-1 h-3 w-3" /> Edit
                              </Button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {grouped.length === 0 && !pricing.isLoading && (
              <p className="text-sm text-muted-foreground">No tariffs configured yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add tariff</CardTitle>
          <CardDescription>Pick a service from the catalog dropdown — names stay consistent everywhere.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a service…" />
            </SelectTrigger>
            <SelectContent>
              {(services.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.serviceName} <span className="text-muted-foreground">· {s.serviceCode}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={payerType} onValueChange={setPayerType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(payers.data ?? []).map((p) => (
                <SelectItem key={p} value={p}>{PAYER_LABEL[p] ?? p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Payer label (e.g. 'Acacia Health' for INSURANCE_PRIVATE)"
            value={payerLabel}
            onChange={(e) => setPayerLabel(e.target.value)}
          />
          <Input placeholder="Amount (GH₵)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="Effective from (YYYY-MM-DD, optional)" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          <Button onClick={submitAdd} disabled={addMut.isPending || !serviceId}>
            {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save tariff"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
