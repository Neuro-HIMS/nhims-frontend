"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { FilterChip } from "@/components/pharmacy/inventory/shared/filter-chip-bar";
import { InventoryPageHeader } from "@/components/pharmacy/inventory/shared/inventory-page-header";
import { SupplierFormDialog } from "@/components/pharmacy/inventory/suppliers/supplier-form-dialog";
import { SupplierToolbar, type SupplierStatusFilter } from "@/components/pharmacy/inventory/suppliers/supplier-toolbar";
import { SuppliersTable } from "@/components/pharmacy/inventory/suppliers/suppliers-table";
import { queryKeys } from "@/lib/query-keys";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import type { ApiError } from "@/types/api.types";
import type { PharmacySupplierDto } from "@/types/pharmacy-inventory.types";

function activeQueryParam(status: SupplierStatusFilter): boolean | undefined {
  if (status === "active") return true;
  if (status === "inactive") return false;
  return undefined;
}

export function SuppliersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState<SupplierStatusFilter>("all");

  const activeKey = status === "all" ? "all" : status === "active" ? "true" : "false";
  const queryKey = queryKeys.pharmacyInventory.suppliers(deferredSearch.trim(), country.trim(), activeKey);

  const suppliersQuery = useQuery({
    queryKey,
    queryFn: () =>
      pharmacyInventoryService.listSuppliers({
        q: deferredSearch.trim() || undefined,
        country: country.trim() || undefined,
        active: activeQueryParam(status),
      }),
  });

  const countryOptions = useMemo(() => {
    const raw = suppliersQuery.data ?? [];
    const set = new Set<string>();
    raw.forEach((s) => {
      const c = (s.country ?? "").trim();
      if (c) set.add(c);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [suppliersQuery.data]);

  const chips: FilterChip[] = useMemo(() => {
    const c: FilterChip[] = [];
    if (deferredSearch.trim()) c.push({ id: "q", label: `Search: ${deferredSearch.trim()}` });
    if (country.trim()) c.push({ id: "country", label: `Country: ${country.trim()}` });
    if (status !== "all") c.push({ id: "status", label: `Status: ${status}` });
    return c;
  }, [deferredSearch, country, status]);

  function removeChip(id: string) {
    if (id === "q") setSearch("");
    if (id === "country") setCountry("");
    if (id === "status") setStatus("all");
  }

  function resetFilters() {
    setSearch("");
    setCountry("");
    setStatus("all");
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<PharmacySupplierDto | null>(null);

  function openCreate() {
    setDialogMode("create");
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: PharmacySupplierDto) {
    setDialogMode("edit");
    setEditing(row);
    setDialogOpen(true);
  }

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: queryKeys.pharmacyInventory.all }).catch(() => undefined);

  const createMut = useMutation({
    mutationFn: pharmacyInventoryService.createSupplier,
    onSuccess: async () => {
      await invalidate();
      toast.success("Supplier added");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not create supplier");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof pharmacyInventoryService.updateSupplier>[1];
    }) => pharmacyInventoryService.updateSupplier(id, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success("Supplier updated");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not update supplier");
    },
  });

  const deactivateMut = useMutation({
    mutationFn: pharmacyInventoryService.deactivateSupplier,
    onSuccess: async () => {
      await invalidate();
      toast.success("Supplier deactivated");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not deactivate supplier");
    },
  });

  const pending = createMut.isPending || updateMut.isPending || deactivateMut.isPending;

  return (
    <div className="space-y-4">
      <InventoryPageHeader
        title="Suppliers"
        description="Manage distributors and manufacturers linked to pharmacy receipts. Filters mirror warehouse dashboards — refine large supplier lists without losing context."
        onAdd={openCreate}
        addLabel="Add Supplier"
      />

      <SupplierToolbar
        search={search}
        onSearchChange={setSearch}
        country={country}
        onCountryChange={setCountry}
        countryOptions={countryOptions}
        status={status}
        onStatusChange={setStatus}
        chips={chips}
        onRemoveChip={removeChip}
        onResetFilters={resetFilters}
      />

      {suppliersQuery.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading suppliers…
        </div>
      ) : (
        <SuppliersTable rows={suppliersQuery.data ?? []} onEdit={openEdit} />
      )}

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={editing}
        pending={pending}
        onSubmitCreate={async (payload) => {
          await createMut.mutateAsync(payload);
        }}
        onSubmitEdit={async (id, payload) => {
          await updateMut.mutateAsync({ id, payload });
        }}
        onDeactivate={
          dialogMode === "edit"
            ? async (id) => {
                await deactivateMut.mutateAsync(id);
              }
            : undefined
        }
      />
    </div>
  );
}
