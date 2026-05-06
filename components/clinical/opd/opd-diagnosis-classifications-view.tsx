"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types/auth.types";
import type { ApiError } from "@/types/api.types";
import type { ClinicalConditionDto } from "@/types/clinical.types";

const WRITE_ROLES: UserRole[] = ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Maintain the shared facility ICD-11 disease classification catalogue used in OPD consultations.
 */
export function OpdDiagnosisClassificationsView() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role as UserRole | undefined);
  const canWrite = role ? WRITE_ROLES.includes(role) : false;
  const fileRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [activeOnly, setActiveOnly] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalConditionDto | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcd11, setFormIcd11] = useState("");
  const [formHint, setFormHint] = useState("");
  const [formActive, setFormActive] = useState(true);

  const listQuery = useQuery({
    queryKey: queryKeys.clinical.conditionsPage(searchApplied, page, activeOnly, PAGE_SIZE),
    queryFn: () =>
      clinicalService.conditionsPaged({
        q: searchApplied.trim() || undefined,
        page,
        size: PAGE_SIZE,
        activeOnly,
        sort: "code",
      }),
  });

  const createMut = useMutation({
    mutationFn: clinicalService.createCondition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Classification created");
      setEditorOpen(false);
      resetForm();
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Could not save"),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { description: string; icdHint?: string; icd11Code?: string; active: boolean };
    }) => clinicalService.updateCondition(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Classification updated");
      setEditorOpen(false);
      setEditing(null);
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Could not update"),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => clinicalService.importConditions(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      const errPreview = res.errors.slice(0, 5).join("; ");
      if (res.errors.length === 0) {
        toast.success(`Imported ${res.imported}; skipped ${res.skipped}`);
      } else {
        toast.message(`Imported ${res.imported}; skipped ${res.skipped}`, {
          description: errPreview || undefined,
        });
      }
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Import failed"),
  });

  function resetForm() {
    setFormCode("");
    setFormDescription("");
    setFormIcd11("");
    setFormHint("");
    setFormActive(true);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setEditorOpen(true);
  }

  function openEdit(row: ClinicalConditionDto) {
    setEditing(row);
    setFormCode(row.code);
    setFormDescription(row.description);
    setFormIcd11(row.icd11Code ?? "");
    setFormHint(row.icdHint ?? "");
    setFormActive(row.active);
    setEditorOpen(true);
  }

  const totalPages = listQuery.data?.totalPages ?? 0;
  const content = listQuery.data?.content ?? [];

  async function exportAs(format: "csv" | "xlsx") {
    try {
      const blob = await clinicalService.exportConditions({
        format,
        q: searchApplied.trim() || undefined,
        activeOnly,
      });
      downloadBlob(blob, format === "xlsx" ? "classifications.xlsx" : "classifications.csv");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Export failed");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnosis classifications (ICD-11)</CardTitle>
          <CardDescription>
            Single facility catalogue shared with consultation notes. Codes are unique per facility; ICD-11 codes follow WHO norms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Code, wording, ICD-11…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearchApplied(q);
                      setPage(0);
                    }
                  }}
                  className="w-64"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearchApplied(q);
                    setPage(0);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
              <Switch checked={activeOnly} onCheckedChange={(v) => { setActiveOnly(v); setPage(0); }} />
              Active only
            </label>
            {canWrite ? (
              <div className="ml-auto flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => exportAs("csv")}>
                  <Download className="mr-1.5 h-4 w-4" />
                  CSV
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => exportAs("xlsx")}>
                  <Download className="mr-1.5 h-4 w-4" />
                  XLSX
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) importMut.mutate(f);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={importMut.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  {importMut.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  Import
                </Button>
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">ICD-11</th>
                  <th className="px-3 py-2">Legacy hint</th>
                  <th className="px-3 py-2">Status</th>
                  {canWrite ? <th className="px-3 py-2 w-28">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listQuery.isLoading ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Loading…
                    </td>
                  </tr>
                ) : content.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                      No classifications match — adjust filters or create a row.
                    </td>
                  </tr>
                ) : (
                  content.map((row) => (
                    <tr key={row.id} className={!row.active ? "bg-muted/20" : undefined}>
                      <td className="px-3 py-2 align-top font-clinical">{row.code}</td>
                      <td className="px-3 py-2 align-top">{row.description}</td>
                      <td className="px-3 py-2 align-top font-clinical text-xs">{row.icd11Code || "—"}</td>
                      <td className="px-3 py-2 align-top font-clinical text-xs text-muted-foreground">
                        {row.icdHint || "—"}
                      </td>
                      <td className="px-3 py-2 align-top">{row.active ? "Active" : "Inactive"}</td>
                      {canWrite ? (
                        <td className="px-3 py-2 align-top">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {page + 1}
              {totalPages > 0 ? ` of ${totalPages}` : ""} · {listQuery.data?.totalElements ?? 0} rows
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={totalPages <= 0 || page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit classification" : "New classification"}</DialogTitle>
            <DialogDescription>
              Short <strong>code</strong> is the facility key; <strong>ICD-11</strong> stores the WHO code for reporting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                disabled={Boolean(editing)}
                className="font-clinical uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title / description *</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ICD-11 code</Label>
              <Input value={formIcd11} onChange={(e) => setFormIcd11(e.target.value)} className="font-clinical text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Legacy ICD hint (optional)</Label>
              <Input value={formHint} onChange={(e) => setFormHint(e.target.value)} className="font-clinical text-xs" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={formActive} onCheckedChange={setFormActive} /> Active in catalogue
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditorOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            {editing ? (
              <Button
                type="button"
                disabled={updateMut.isPending || !formDescription.trim()}
                onClick={() =>
                  updateMut.mutate({
                    id: editing.id,
                    payload: {
                      description: formDescription.trim(),
                      icd11Code: formIcd11.trim() || "",
                      icdHint: formHint.trim() || "",
                      active: formActive,
                    },
                  })
                }
              >
                {updateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            ) : (
              <Button
                type="button"
                disabled={createMut.isPending || !formCode.trim() || !formDescription.trim()}
                onClick={() =>
                  createMut.mutate({
                    code: formCode.trim(),
                    description: formDescription.trim(),
                    icd11Code: formIcd11.trim() || undefined,
                    icdHint: formHint.trim() || undefined,
                    active: formActive,
                  })
                }
              >
                {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
