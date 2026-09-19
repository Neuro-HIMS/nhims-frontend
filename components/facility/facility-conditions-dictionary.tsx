"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Pencil, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { TableSkeleton } from "@/components/common/skeletons";
import { UploadDropzone } from "@/components/common/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types/auth.types";
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
 * Single source of truth for facility diagnosis classifications (ICD-11 catalogue).
 * Shown under Facility settings; drives consultation note pickers app-wide.
 */
export function FacilityDiagnosisClassificationsSettings() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role as UserRole | undefined);
  const canWrite = role ? WRITE_ROLES.includes(role) : false;
  const [importOpen, setImportOpen] = useState(false);

  const [q, setQ] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [activeOnly, setActiveOnly] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalConditionDto | null>(null);

  const [formName, setFormName] = useState("");
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
        sort: "name",
      }),
  });

  const createMut = useMutation({
    mutationFn: clinicalService.createCondition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      notify.success("Diagnosis added.");
      setEditorOpen(false);
      resetForm();
    },
    onError: (e: unknown) => notify.error(getFriendlyError(e).message),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        name: string;
        description?: string | null;
        icdHint?: string;
        icd11Code?: string;
        active: boolean;
      };
    }) => clinicalService.updateCondition(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      notify.success("Diagnosis saved.");
      setEditorOpen(false);
      setEditing(null);
    },
    onError: (e: unknown) => notify.error(getFriendlyError(e).message),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => clinicalService.importConditions(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      setImportOpen(false);
      const errPreview = res.errors.slice(0, 5).join("; ");
      if (res.errors.length === 0) {
        notify.success(`Added ${res.imported} diagnoses. Skipped ${res.skipped} already in the list.`);
      } else {
        notify.error(`Added ${res.imported}, skipped ${res.skipped}. Some rows had problems: ${errPreview}`);
      }
    },
    onError: (e: unknown) => notify.error(getFriendlyError(e).message),
  });

  function resetForm() {
    setFormName("");
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
    setFormName(typeof row.name === "string" ? row.name : "");
    setFormDescription(row.description ?? "");
    setFormIcd11(row.icd11Code ?? "");
    setFormHint(row.icdHint ?? "");
    setFormActive(Boolean(row.active));
    setEditorOpen(true);
  }

  const totalPages = listQuery.data?.totalPages ?? 0;
  const content = listQuery.data?.content ?? [];

  const nameTrimmed = (formName ?? "").trim();
  const descriptionTrimmed = (formDescription ?? "").trim();
  const icd11Trimmed = (formIcd11 ?? "").trim();
  const hintTrimmed = (formHint ?? "").trim();

  async function exportAs(format: "csv" | "xlsx") {
    try {
      const blob = await clinicalService.exportConditions({
        format,
        q: searchApplied.trim() || undefined,
        activeOnly,
      });
      downloadBlob(blob, format === "xlsx" ? "diagnosis-list.xlsx" : "diagnosis-list.csv");
    } catch (e: unknown) {
      notify.error(getFriendlyError(e).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnosis list</CardTitle>
          <CardDescription>The diagnoses your team can pick from a visit. Only the name is required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. diabetes"
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
                  Search
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
              <Switch
                checked={activeOnly}
                onCheckedChange={(v) => {
                  setActiveOnly(v);
                  setPage(0);
                }}
              />
              Show in use only
            </label>
            {canWrite ? (
              <div className="ml-auto flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => exportAs("csv")}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download (CSV)
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => exportAs("xlsx")}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download (spreadsheet)
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                  Add many at once
                </Button>
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add diagnosis
                </Button>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">ICD-11 code</th>
                  <th className="px-3 py-2">Status</th>
                  {canWrite ? <th className="px-3 py-2 w-28">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {content.map((row) => (
                  <tr key={row.id} className={!row.active ? "bg-muted/20" : undefined}>
                    <td className="px-3 py-2 align-top font-medium">{row.name?.trim() || "—"}</td>
                    <td className="px-3 py-2 align-top text-muted-foreground">{row.description?.trim() || "—"}</td>
                    <td className="px-3 py-2 align-top font-clinical text-xs text-muted-foreground">
                      {row.icd11Code || "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusPill tone={row.active ? "success" : "neutral"}>{row.active ? "In use" : "Not in use"}</StatusPill>
                    </td>
                    {canWrite ? (
                      <td className="px-3 py-2 align-top">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
                          <Pencil className="mr-1 h-4 w-4" /> Edit
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {listQuery.isLoading && <TableSkeleton rows={5} columns={canWrite ? 5 : 4} />}
            {!listQuery.isLoading && content.length === 0 && (
              <EmptyState
                illustration="no-results"
                title={searchApplied ? `No diagnosis found for "${searchApplied}"` : "No diagnoses yet"}
                description={
                  searchApplied
                    ? "Check the spelling, or add it as a new diagnosis."
                    : "Diagnoses you add will appear here."
                }
                action={canWrite ? { label: "Add diagnosis", onClick: openCreate } : undefined}
              />
            )}
          </div>

          {content.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page + 1}
                {totalPages > 0 ? ` of ${totalPages}` : ""} · {listQuery.data?.totalElements ?? 0} diagnoses
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
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add many diagnoses at once</DialogTitle>
            <DialogDescription>
              Upload a spreadsheet with a name column. Each row becomes a new diagnosis, or updates one with a
              matching name.
            </DialogDescription>
          </DialogHeader>
          <UploadDropzone
            accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            maxSizeMb={10}
            helperText="CSV or spreadsheet file, up to 10 MB"
            onFile={(file) => importMut.mutate(file)}
            disabled={importMut.isPending}
          />
          {importMut.isPending && <p className="text-sm text-muted-foreground">Adding diagnoses…</p>}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit diagnosis" : "Add diagnosis"}</DialogTitle>
            <DialogDescription>Only the name is required.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={formName ?? ""}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Type 2 diabetes mellitus"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={formDescription ?? ""}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Optional short clarification"
                className="resize-y min-h-[72px]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">ICD-11 code (optional)</Label>
                <Input value={formIcd11 ?? ""} onChange={(e) => setFormIcd11(e.target.value)} className="font-clinical text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Old code, if there is one (optional)</Label>
                <Input value={formHint ?? ""} onChange={(e) => setFormHint(e.target.value)} className="font-clinical text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
              <Checkbox
                id="catalogue-active"
                checked={formActive}
                onCheckedChange={(v) => setFormActive(v === true)}
              />
              <Label htmlFor="catalogue-active" className="cursor-pointer text-sm font-normal leading-snug">
                Show this diagnosis in the list
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditorOpen(false);
                resetForm();
              }}
            >
              Go back
            </Button>
            {editing ? (
              <Button
                type="button"
                disabled={updateMut.isPending || !nameTrimmed}
                onClick={() =>
                  updateMut.mutate({
                    id: editing.id,
                    payload: {
                      name: nameTrimmed,
                      description: descriptionTrimmed || null,
                      icd11Code: icd11Trimmed || "",
                      icdHint: hintTrimmed || "",
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
                disabled={createMut.isPending || !nameTrimmed}
                onClick={() =>
                  createMut.mutate({
                    name: nameTrimmed,
                    description: descriptionTrimmed || undefined,
                    icd11Code: icd11Trimmed || undefined,
                    icdHint: hintTrimmed || undefined,
                    active: formActive,
                  })
                }
              >
                {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add diagnosis
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
