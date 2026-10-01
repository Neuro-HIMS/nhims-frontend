"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { InventoryItemFormDialog } from "@/components/pharmacy/inventory/inventory-item-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type { CreatePharmacyInventoryItemPayload, PharmacyInventoryItemDto } from "@/types/pharmacy-inventory.types";

/** PHA-09 — the medicines the pharmacy stocks (the formulary). */
export function MedicinesPage() {
  const qc = useQueryClient();
  const [showOff, setShowOff] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PharmacyInventoryItemDto | "new" | null>(null);
  const [switchingOff, setSwitchingOff] = useState<PharmacyInventoryItemDto | null>(null);

  const itemsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.items(showOff ? "all" : "true"),
    queryFn: () => pharmacyInventoryService.listInventoryItems(showOff ? undefined : true),
  });
  // Same query key as the medicine form's price-list picker, so it's fetched once.
  const catalogQuery = useQuery({
    queryKey: queryKeys.clinical.catalog("PHARMACY"),
    queryFn: () => clinicalService.catalog("PHARMACY"),
  });
  const nhisById = useMemo(
    () => new Map((catalogQuery.data ?? []).map((c) => [c.id, Boolean(c.nhisTariffCode?.trim())])),
    [catalogQuery.data],
  );
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...(itemsQuery.data ?? [])]
      .filter((i) => !s || i.displayName.toLowerCase().includes(s) || i.skuCode.toLowerCase().includes(s))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [itemsQuery.data, q]);

  const saveMut = useMutation({
    mutationFn: async (payload: CreatePharmacyInventoryItemPayload) => {
      if (editing && editing !== "new") {
        return pharmacyInventoryService.updateInventoryItem(editing.id, {
          ...payload,
          removeCatalogLink: payload.catalogServiceId == null && Boolean(editing.catalogServiceId),
          removeDefaultSupplierLink: payload.defaultSupplierId == null && Boolean(editing.defaultSupplierId),
        });
      }
      return pharmacyInventoryService.createInventoryItem(payload);
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success(editing === "new" ? `${item.displayName} added.` : `${item.displayName} updated.`);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const offMut = useMutation({
    mutationFn: (id: string) => pharmacyInventoryService.deactivateInventoryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all });
      toast.success("Medicine switched off. It won't be offered for new stock.");
      setSwitchingOff(null);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search medicines" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Medicine or stock code" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="meds-show-off" checked={showOff} onCheckedChange={setShowOff} />
            <Label htmlFor="meds-show-off" className="text-sm font-normal">
              Show switched-off medicines
            </Label>
          </div>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add medicine
        </Button>
      </div>

      {itemsQuery.isPending ? (
        <TableSkeleton rows={5} columns={6} />
      ) : itemsQuery.isError ? (
        <ErrorState error={itemsQuery.error} onRetry={() => void itemsQuery.refetch()} />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration={q ? "no-results" : "empty-list"}
            title={q ? "No medicine matches your search" : "No medicines yet"}
            description={q ? "Try another word." : "Add the medicines the pharmacy stocks, then receive stock for them."}
            action={q ? undefined : { label: "Add medicine", onClick: () => setEditing("new") }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium tracking-wide">Medicine</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Stock code</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Reorder at</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Price list</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">NHIS</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Status</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{i.displayName}</p>
                    <p className="text-xs text-muted-foreground">{[i.dosageForm, i.strength].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-4 py-2.5 font-clinical text-xs">{i.skuCode || "—"}</td>
                  <td className="px-4 py-2.5 font-clinical text-xs">{Number(i.reorderLevel) || "—"}</td>
                  <td className="px-4 py-2.5">
                    {i.catalogServiceId ? (
                      <StatusPill tone="success">Linked</StatusPill>
                    ) : (
                      <StatusPill tone="warning">Not linked — can&apos;t be given from a prescription</StatusPill>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {!i.catalogServiceId || catalogQuery.isPending ? (
                      <span className="text-muted-foreground">—</span>
                    ) : nhisById.get(i.catalogServiceId) ? (
                      <StatusPill tone="info">Covered</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Not covered</StatusPill>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={i.active ? "success" : "neutral"}>{i.active ? "Stocked" : "Switched off"}</StatusPill>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>
                        Edit
                      </Button>
                      {i.active && (
                        <Button size="sm" variant="ghost" onClick={() => setSwitchingOff(i)}>
                          Switch off
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InventoryItemFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing === "new" ? null : editing}
        pending={saveMut.isPending}
        onSubmit={async (payload) => {
          await saveMut.mutateAsync(payload);
        }}
      />
      <ConfirmDialog
        open={switchingOff !== null}
        onOpenChange={(o) => !o && setSwitchingOff(null)}
        title={`Switch off ${switchingOff?.displayName ?? "this medicine"}?`}
        description="It won't be offered when receiving stock. Stock already on the shelf and past records stay."
        confirmLabel="Switch off"
        cancelLabel="Keep it"
        destructive
        pending={offMut.isPending}
        onConfirm={async () => {
          if (switchingOff) await offMut.mutateAsync(switchingOff.id);
        }}
      />
    </div>
  );
}
