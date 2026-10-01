"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { DataTable, TableToolbar, type DataTableColumn } from "@/components/common/data-table";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { MoneyInput } from "@/components/common/money-input";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { chargeGroupLabel, formatMoney, parseMoney, todayLocal } from "@/lib/billing";
import { formatClinicalDate } from "@/lib/dates";
import { nextPrice, PRICE_PAYERS, priceOn } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { financeService } from "@/services/finance.service";
import type { ServiceCatalogDto, ServicePricingDto } from "@/types/finance.types";

/** FIN-02 — every service the hospital charges for, and its price for each type of patient. */
export function ServicesPricesView() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("ALL");
  const [showOff, setShowOff] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogDto | "new" | null>(null);

  const servicesQuery = useQuery({ queryKey: queryKeys.finance.services, queryFn: () => financeService.listServices(false) });
  const pricingQuery = useQuery({ queryKey: queryKeys.finance.pricing, queryFn: () => financeService.listPricingMatrix() });
  const groupsQuery = useQuery({ queryKey: queryKeys.finance.groups, queryFn: () => financeService.serviceGroups() });

  const today = todayLocal();
  const pricing = useMemo(() => pricingQuery.data ?? [], [pricingQuery.data]);
  const rows = useMemo(() => {
    if (!servicesQuery.data) return undefined;
    const q = search.trim().toLowerCase();
    return servicesQuery.data
      .filter((s) => (showOff || s.active) && (group === "ALL" || s.serviceGroup === group))
      .filter((s) => !q || s.serviceName.toLowerCase().includes(q) || s.serviceCode.toLowerCase().includes(q) || (s.nhisTariffCode ?? "").toLowerCase().includes(q))
      .sort((a, b) => a.serviceName.localeCompare(b.serviceName));
  }, [servicesQuery.data, search, group, showOff]);

  const priceCell = (s: ServiceCatalogDto, payer: string) => {
    if (pricingQuery.isPending) return <span className="text-muted-foreground">…</span>;
    const p = priceOn(pricing, s.id, payer, today);
    const next = nextPrice(pricing, s.id, payer, today);
    return (
      <div className="text-right">
        <span className={`font-clinical ${p ? "text-foreground" : "text-muted-foreground"}`}>{p ? formatMoney(p.unitPriceMinor) : payer === "NHIS" ? "Uses self-pay price" : "—"}</span>
        {next && next.effectiveFrom && <p className="text-xs text-muted-foreground">{`${formatMoney(next.unitPriceMinor)} from ${formatClinicalDate(next.effectiveFrom)}`}</p>}
      </div>
    );
  };

  const columns: DataTableColumn<ServiceCatalogDto>[] = [
    {
      key: "service",
      header: "Service",
      cell: (s) => (
        <div>
          <p className="font-medium text-foreground">{s.serviceName}</p>
          <p className="text-xs text-muted-foreground">
            {chargeGroupLabel(s.serviceGroup)}
            {s.nhisTariffCode ? <span className="font-clinical"> · NHIS {s.nhisTariffCode}</span> : ""}
          </p>
        </div>
      ),
    },
    ...PRICE_PAYERS.slice(0, 3).map((p) => ({ key: p.code, header: p.label, className: "text-right", cell: (s: ServiceCatalogDto) => priceCell(s, p.code) })),
    { key: "status", header: "Status", hideOnTablet: true, cell: (s) => <StatusPill tone={s.active ? "success" : "neutral"}>{s.active ? "In use" : "Switched off"}</StatusPill> },
  ];

  const filtered = search.trim() !== "" || group !== "ALL";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Bills and orders use these names and prices. Old prices are kept when you change one.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add service
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => s.id}
        isLoading={servicesQuery.isPending}
        error={servicesQuery.isError ? servicesQuery.error : pricingQuery.isError ? pricingQuery.error : undefined}
        onRetry={() => {
          void servicesQuery.refetch();
          void pricingQuery.refetch();
        }}
        onRowClick={setEditing}
        toolbar={
          <TableToolbar
            search={{ value: search, onChange: setSearch, placeholder: "Service, code or NHIS code" }}
            filters={
              <>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger className="h-9 w-44" aria-label="Group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All groups</SelectItem>
                    {(groupsQuery.data ?? []).map((g) => (
                      <SelectItem key={g} value={g}>
                        {chargeGroupLabel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch id="svc-show-off" checked={showOff} onCheckedChange={setShowOff} />
                  <Label htmlFor="svc-show-off" className="text-sm font-normal">
                    Show switched-off services
                  </Label>
                </div>
              </>
            }
          />
        }
        empty={
          filtered
            ? { illustration: "no-results", title: "No services match", description: "Try another word or group.", action: { label: "Show all", onClick: () => { setSearch(""); setGroup("ALL"); } } }
            : { illustration: "empty-list", title: "No services yet", description: "Add the services the hospital charges for.", action: { label: "Add service", onClick: () => setEditing("new") } }
        }
      />
      <ServiceDialog open={editing !== null} service={editing === "new" ? null : editing} pricing={pricing} groups={groupsQuery.data ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}

interface PriceDraft {
  amount: string;
  from: string;
}

function ServiceDialog(props: { open: boolean; service: ServiceCatalogDto | null; pricing: ServicePricingDto[]; groups: string[]; onClose: () => void }) {
  // Mounted per open so the form starts from the service's current values.
  if (!props.open) return null;
  return <ServiceDialogBody key={props.service?.id ?? "new"} {...props} />;
}

function ServiceDialogBody({ service, pricing, groups, onClose }: { service: ServiceCatalogDto | null; pricing: ServicePricingDto[]; groups: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const today = todayLocal();
  const [name, setName] = useState(service?.serviceName ?? "");
  const [code, setCode] = useState(service?.serviceCode ?? "");
  const [group, setGroup] = useState(service?.serviceGroup ?? "CONSULTATION");
  const [nhisCode, setNhisCode] = useState(service?.nhisTariffCode ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [active, setActive] = useState(service?.active ?? true);
  const [prices, setPrices] = useState<Record<string, PriceDraft>>(() => Object.fromEntries(PRICE_PAYERS.map((p) => [p.code, { amount: "", from: today }])));
  const [tried, setTried] = useState(false);

  const history = service ? pricing.filter((r) => r.serviceId === service.id).sort((a, b) => (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? "")) : [];

  const priceErrors = Object.fromEntries(
    PRICE_PAYERS.map((p) => {
      const d = prices[p.code];
      if (!d.amount.trim()) return [p.code, null];
      if (!Number.isFinite(parseMoney(d.amount))) return [p.code, "Enter an amount like 25.00."];
      return [p.code, null];
    }),
  ) as Record<string, string | null>;
  const problems = [!name.trim() && "Enter the service name.", !service && !code.trim() && "Enter a code.", ...Object.values(priceErrors).filter(Boolean)].filter(Boolean) as string[];

  // Set once a new service is created, so a retry after a failed price only redoes the prices.
  const [created, setCreated] = useState<ServiceCatalogDto | null>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      const target = service ?? created;
      const saved = target
        ? await financeService.updateService(target.id, { serviceName: name.trim(), serviceGroup: group, nhisTariffCode: nhisCode.trim(), description: description.trim(), active })
        : await financeService.createService({ serviceCode: code.trim(), serviceName: name.trim(), serviceGroup: group, nhisTariffCode: nhisCode.trim(), description: description.trim(), active: true });
      if (!target) setCreated(saved);
      // A new price is a new row starting today (the old one stays in the history). A second change on the
      // same day updates today's row: two rows with the same start date would make the charged price a toss-up.
      for (const p of PRICE_PAYERS) {
        const d = prices[p.code];
        if (!d.amount.trim()) continue;
        const sameDay = pricing.find((r) => r.serviceId === saved.id && r.payerType === p.code && r.active && r.effectiveFrom === d.from);
        const body = { serviceId: saved.id, payerType: p.code, unitPriceMinor: parseMoney(d.amount), currency: "GHS", effectiveFrom: d.from, active: true };
        if (sameDay) await financeService.updatePricing(sameDay.id, { ...body, payerLabel: sameDay.payerLabel });
        else await financeService.addPricing(body);
      }
      return saved;
    },
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: queryKeys.finance.all });
      void qc.invalidateQueries({ queryKey: ["clinical", "catalog"] });
      toast.success(service ? `${s.serviceName} updated.` : `${s.serviceName} added.`);
      onClose();
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !saveMut.isPending && onClose()}
      size="xl"
      title={service ? service.serviceName : "Add a service"}
      description={service ? `Code ${service.serviceCode}. A new price starts today; the old one is kept.` : "Something the hospital charges for. Bills and orders will use this name."}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saveMut.isPending}>
            Cancel
          </Button>
          <Button
            disabled={saveMut.isPending}
            onClick={() => {
              setTried(true);
              if (problems.length === 0) saveMut.mutate();
            }}
          >
            {saveMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {service ? "Save changes" : "Add service"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="The service">
        <div className="space-y-1.5">
          <Label htmlFor="svc-name">Name</Label>
          <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full blood count" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-code">Code</Label>
          <Input id="svc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={Boolean(service)} className="font-clinical" placeholder="e.g. LAB-FBC" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-group">Group</Label>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger id="svc-group" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(groups.length ? groups : ["CONSULTATION", "LAB", "IMAGING", "PHARMACY", "PROCEDURE", "WARD", "OTHER"]).map((g) => (
                <SelectItem key={g} value={g}>
                  {chargeGroupLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-nhis">NHIS price code (optional)</Label>
          <Input id="svc-nhis" value={nhisCode} onChange={(e) => setNhisCode(e.target.value)} className="font-clinical" />
          <p className="text-xs text-muted-foreground">Needed for NHIS to pay for it.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="svc-desc">Description (optional)</Label>
          <Textarea id="svc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {service && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="svc-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="svc-active" className="font-normal">
              In use. Switched-off services can&apos;t be added to bills or ordered.
            </Label>
          </div>
        )}
      </FormDialogSection>

      <FormDialogSection title="Prices" columns={1}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-1.5 pr-3 font-medium">Patient type</th>
                <th className="py-1.5 pr-3 text-right font-medium">Price now</th>
                <th className="py-1.5 pr-3 font-medium">New price</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PRICE_PAYERS.map((p) => {
                const now = service ? priceOn(pricing, service.id, p.code, today) : null;
                const err = tried ? priceErrors[p.code] : null;
                return (
                  <tr key={p.code}>
                    <td className="py-2 pr-3 text-foreground">{p.label}</td>
                    <td className="py-2 pr-3 text-right font-clinical">{now ? formatMoney(now.unitPriceMinor) : <span className="text-muted-foreground">Not set</span>}</td>
                    <td className="py-2 pr-3">
                      <MoneyInput id={`price-${p.code}`} value={prices[p.code].amount} onChange={(v) => setPrices((all) => ({ ...all, [p.code]: { ...all[p.code], amount: v } }))} placeholder={now ? "Leave empty to keep" : "0.00"} error={err ?? undefined} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Prices start today: the backend charges the newest price even before its start date
            (backend-gaps.md#FIN-02-future-price), so a later start date isn't offered yet. */}
        <p className="text-xs text-muted-foreground">New prices start today. The old price stays in the history below.</p>
        {tried && problems.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-destructive" role="alert">
            {problems.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </FormDialogSection>

      {history.length > 0 && (
        <FormDialogSection title="Price history" columns={1}>
          <ul className="divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="text-foreground">{PRICE_PAYERS.find((p) => p.code === h.payerType)?.label ?? h.payerLabel ?? h.payerType}</span>
                <span className="text-muted-foreground">
                  {h.effectiveFrom ? `From ${formatClinicalDate(h.effectiveFrom)}` : "From the start"}
                  {h.effectiveTo ? ` to ${formatClinicalDate(h.effectiveTo)}` : ""}
                  {!h.active ? " · switched off" : ""}
                </span>
                <span className="font-clinical">{formatMoney(h.unitPriceMinor)}</span>
              </li>
            ))}
          </ul>
        </FormDialogSection>
      )}
    </FormDialog>
  );
}
