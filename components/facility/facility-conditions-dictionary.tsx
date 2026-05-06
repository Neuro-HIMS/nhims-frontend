"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types/auth.types";
import type { ApiError } from "@/types/api.types";

const WRITE_ROLES: UserRole[] = ["MEDICAL_OFFICER", "FACILITY_ADMIN", "SUPER_ADMIN"];

export function FacilityConditionsDictionary() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role as UserRole | undefined);
  const canWrite = role ? WRITE_ROLES.includes(role) : false;

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [icdHint, setIcdHint] = useState("");
  const [icd11, setIcd11] = useState("");

  const listQuery = useQuery({
    queryKey: [...queryKeys.clinical.conditions(q, !showInactive)],
    queryFn: () => clinicalService.conditions({ q: q.trim() || undefined, activeOnly: !showInactive }),
  });

  const createMut = useMutation({
    mutationFn: clinicalService.createCondition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Condition saved");
      setCode("");
      setDescription("");
      setIcdHint("");
      setIcd11("");
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Could not save"),
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
      toast.success("Condition updated");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: ApiError } }).response?.data?.message ?? "Could not update"),
  });

  const rows = listQuery.data ?? [];
  const sorted = useMemo(() => [...rows].sort((a, b) => a.code.localeCompare(b.code)), [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-muted-foreground" /> Problem list dictionary
        </CardTitle>
        <CardDescription>
          Short codes surfaced in consultations for consistent diagnoses. Maintain them here rather than scattering free-text ICD
          guesses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 items-center gap-2">
            <Input placeholder="Search code or wording…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            {listQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Show inactive rows
          </label>
        </div>

        {canWrite && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Add dictionary entry</p>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <div className="space-y-1 md:col-span-1">
                <Label className="text-xs">Code *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-clinical uppercase" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Label *</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label className="text-xs">ICD-11 (optional)</Label>
                <Input value={icd11} onChange={(e) => setIcd11(e.target.value)} className="font-clinical text-xs" />
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label className="text-xs">Legacy ICD hint</Label>
                <Input value={icdHint} onChange={(e) => setIcdHint(e.target.value)} className="font-clinical text-xs" />
              </div>
            </div>
            <Button
              className="mt-3"
              size="sm"
              disabled={createMut.isPending || !code.trim() || !description.trim()}
              onClick={() =>
                createMut.mutate({
                  code: code.trim(),
                  description: description.trim(),
                  icdHint: icdHint.trim() || undefined,
                  icd11Code: icd11.trim() || undefined,
                  active: true,
                })
              }
            >
              {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save dictionary row
            </Button>
          </div>
        )}

        {!canWrite && (
          <p className="text-xs text-muted-foreground">
            Read-only profile — Facility Admin or Medical Officers can extend this dictionary.
          </p>
        )}

        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">ICD-11</th>
                <th className="px-3 py-2">Legacy hint</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                    Nothing matches yet — broaden your search or add a row.
                  </td>
                </tr>
              ) : (
                sorted.map((c) => (
                  <EditableRow key={c.id} c={c} canWrite={canWrite} pending={updateMut.isPending} onSave={(payload) => updateMut.mutate({ id: c.id, payload })} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableRow({
  c,
  canWrite,
  pending,
  onSave,
}: {
  c: import("@/types/clinical.types").ClinicalConditionDto;
  canWrite: boolean;
  pending: boolean;
  onSave: (p: { description: string; icdHint?: string; icd11Code?: string; active: boolean }) => void;
}) {
  const [desc, setDesc] = useState(c.description);
  const [icd11, setIcd11] = useState(c.icd11Code ?? "");
  const [hint, setHint] = useState(c.icdHint ?? "");
  const [active, setActive] = useState(c.active);

  return (
    <tr className={!active ? "bg-muted/20" : undefined}>
      <td className="px-3 py-2 align-top font-clinical">{c.code}</td>
      <td className="px-3 py-2 align-top">
        {canWrite ? (
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} className="text-sm" />
        ) : (
          <span>{c.description}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        {canWrite ? (
          <Input value={icd11} onChange={(e) => setIcd11(e.target.value)} className="font-clinical text-xs" />
        ) : (
          <span className="font-clinical text-xs text-muted-foreground">{c.icd11Code || "—"}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        {canWrite ? (
          <Input value={hint} onChange={(e) => setHint(e.target.value)} className="font-clinical text-xs" />
        ) : (
          <span className="font-clinical text-xs text-muted-foreground">{c.icdHint || "—"}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-col gap-2">
          {active ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
          {canWrite ? (
            <>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={active} onCheckedChange={(v) => setActive(v)} />
                Catalog active flag
              </label>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  onSave({
                    description: desc.trim(),
                    icdHint: hint.trim(),
                    icd11Code: icd11.trim(),
                    active,
                  })
                }
              >
                Save row
              </Button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
