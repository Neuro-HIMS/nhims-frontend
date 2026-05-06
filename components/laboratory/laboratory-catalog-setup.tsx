"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import type { ClinicalServiceDto } from "@/types/clinical.types";
import type { ApiError } from "@/types/api.types";

/**
 * Maintain LAB catalogue rows against the canonical `finance_service_catalog`
 * surface, via `/clinical/catalog/services` (LAB-only writes for lab roles).
 */
export function LaboratoryCatalogSetupView() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);

  const listQuery = useQuery({
    queryKey: [...queryKeys.clinical.labCatalogSetup, "LAB", showInactive],
    queryFn: () => clinicalService.catalog("LAB", !showInactive),
  });

  const createMut = useMutation({
    mutationFn: clinicalService.createLabCatalogItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.labCatalogSetup });
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("LAB test added — finance pricing still applies independently");
      setForm(EMPTY_CREATE);
      setCreating(false);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Could not add"),
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [editOpen, setEditOpen] = useState<ClinicalServiceDto | null>(null);
  const [editForm, setEditForm] = useState({ serviceName: "", nhisTariffCode: "", description: "", active: true });

  const rows = listQuery.data ?? [];

  function openEdit(row: ClinicalServiceDto) {
    setEditOpen(row);
    setEditForm({
      serviceName: row.serviceName,
      nhisTariffCode: row.nhisTariffCode ?? "",
      description: row.description ?? "",
      active: row.active,
    });
  }

  const saveEdit = useMutation({
    mutationFn: () =>
      clinicalService.updateLabCatalogItem(editOpen!.id, {
        serviceName: editForm.serviceName.trim(),
        serviceGroup: "LAB",
        nhisTariffCode: editForm.nhisTariffCode.trim(),
        description: editForm.description.trim(),
        active: editForm.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.labCatalogSetup });
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Catalog updated");
      setEditOpen(null);
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Could not save"),
  });

  const labRows = useMemo(() => [...rows].sort((a, b) => a.serviceCode.localeCompare(b.serviceCode)), [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            Laboratory catalog (LAB services)
          </CardTitle>
          <CardDescription>
            Each row mirrors a <strong>finance_service_catalog</strong> LAB item — the same record powers billing tariffs and doctor order
            pickers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={(v) => setShowInactive(v)} id="show-inactive-catalog" />
            <Label htmlFor="show-inactive-catalog" className="text-sm">
              Include inactive catalogue rows
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCreating((c) => !c)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {creating ? "Close form" : "New LAB service"}
          </Button>
          {listQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>

      {creating && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add LAB catalogue entry</CardTitle>
            <CardDescription>Provide a stable code clinicians will recognise.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Service code *</Label>
              <Input
                value={form.serviceCode}
                onChange={(e) => setForm({ ...form, serviceCode: e.target.value.toUpperCase() })}
                className="font-clinical uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Display name *</Label>
              <Input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NHIS tariff code (optional)</Label>
              <Input value={form.nhisTariffCode} onChange={(e) => setForm({ ...form, nhisTariffCode: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                disabled={createMut.isPending || !form.serviceCode.trim() || !form.serviceName.trim()}
                onClick={() =>
                  createMut.mutate({
                    serviceCode: form.serviceCode.trim(),
                    serviceName: form.serviceName.trim(),
                    nhisTariffCode: form.nhisTariffCode.trim() || undefined,
                    description: form.description.trim() || undefined,
                    active: true,
                  })
                }
              >
                {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save LAB service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">NHIS tariff</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="inline h-5 w-5 animate-spin" /> Loading LAB catalogue…
                </td>
              </tr>
            ) : labRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No LAB services in this slice — add one above.
                </td>
              </tr>
            ) : (
              labRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-clinical">{r.serviceCode}</td>
                  <td className="px-4 py-2.5">{r.serviceName}</td>
                  <td className="px-4 py-2.5 font-clinical text-xs text-muted-foreground">{r.nhisTariffCode || "—"}</td>
                  <td className="px-4 py-2.5">
                    {r.active ? (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={editOpen !== null}
        onOpenChange={(o) => !o && setEditOpen(null)}
        title={`Edit LAB service ${editOpen?.serviceCode ?? ""}`}
        description="Changes apply immediately across ordering and cashier catalogs for this facility."
        confirmLabel="Save changes"
        pending={saveEdit.isPending}
        footerExtra={
          editOpen ? (
            <div className="grid gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Display name *</Label>
                <Input value={editForm.serviceName} onChange={(e) => setEditForm({ ...editForm, serviceName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NHIS tariff code</Label>
                <Input
                  value={editForm.nhisTariffCode}
                  onChange={(e) => setEditForm({ ...editForm, nhisTariffCode: e.target.value })}
                  className="font-clinical"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editForm.active} onCheckedChange={(active) => setEditForm({ ...editForm, active })} />
                <span className="text-xs text-muted-foreground">Catalog entry active (inactive hides from selectors)</span>
              </div>
            </div>
          ) : null
        }
        onConfirm={async () => {
          await saveEdit.mutateAsync();
        }}
      />
    </div>
  );
}

const EMPTY_CREATE = { serviceCode: "", serviceName: "", nhisTariffCode: "", description: "" };
