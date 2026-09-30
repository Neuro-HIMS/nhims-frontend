"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { TableSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import type { LabParameter, LabTestSetup } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { labService } from "@/services/lab.service";
import type { ClinicalServiceDto, LabResultPanelCode } from "@/types/clinical.types";

const EMPTY_TEST = {
  serviceCode: "",
  serviceName: "",
  nhisTariffCode: "",
  description: "",
  active: true,
  labResultPanel: "NONE" as LabResultPanelCode,
};

/** LAB-08 — the tests this lab offers, and what each one measures. */
export function LaboratoryCatalogSetupView() {
  const qc = useQueryClient();
  const [showOff, setShowOff] = useState(false);
  const [editing, setEditing] = useState<ClinicalServiceDto | "new" | null>(null);
  const [measuring, setMeasuring] = useState<ClinicalServiceDto | null>(null);

  const listQuery = useQuery({
    queryKey: [...queryKeys.clinical.labCatalogSetup, "LAB", showOff],
    queryFn: () => clinicalService.catalog("LAB", !showOff),
  });
  const rows = useMemo(() => [...(listQuery.data ?? [])].sort((a, b) => a.serviceName.localeCompare(b.serviceName)), [listQuery.data]);

  const setupQueries = useQuery({
    queryKey: ["lab", "setup", "all", rows.map((r) => r.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(rows.map(async (r) => [r.id, await labService.setupFor(r)] as const));
      return Object.fromEntries(entries) as Record<string, LabTestSetup>;
    },
    enabled: rows.length > 0,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={showOff} onCheckedChange={setShowOff} id="lab-show-off" />
          <Label htmlFor="lab-show-off" className="text-sm font-normal">
            Show tests that are switched off
          </Label>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add a test
        </Button>
      </div>

      {listQuery.isPending ? (
        <TableSkeleton rows={6} columns={5} />
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="empty-list"
            title="No lab tests set up yet"
            description="Add the tests your lab offers so doctors can order them."
            action={{ label: "Add a test", onClick: () => setEditing("new") }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium tracking-wide">Test</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Sample</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">What&apos;s measured</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">NHIS code</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const setup = setupQueries.data?.[r.id];
                const count = setup?.parameters.length ?? 0;
                const malaria = String(r.labResultPanel).toUpperCase() === "MALARIA_PANEL";
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{r.serviceName}</p>
                      <p className="font-clinical text-xs text-muted-foreground">{r.serviceCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{setup?.sampleType || "—"}</td>
                    <td className="px-4 py-2.5">
                      {malaria ? (
                        <StatusPill tone="info">Malaria worksheet</StatusPill>
                      ) : setupQueries.isPending ? (
                        <span className="text-xs text-muted-foreground">Checking…</span>
                      ) : count > 0 ? (
                        <StatusPill tone="success">{`${count} measurement${count === 1 ? "" : "s"}`}</StatusPill>
                      ) : (
                        <StatusPill tone="pending">Not set up</StatusPill>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-clinical text-xs text-muted-foreground">{r.nhisTariffCode || "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill tone={r.active ? "success" : "neutral"}>{r.active ? "Offered" : "Switched off"}</StatusPill>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setupQueries.isPending || !labService.setupEditable()}
                          title={labService.setupEditable() ? undefined : "Setting measurements isn't available yet"}
                          onClick={() => setMeasuring(r)}
                        >
                          <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Measurements
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TestDialog
        key={editing === "new" ? "test-new" : `test-${editing?.id ?? "closed"}`}
        test={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: queryKeys.clinical.labCatalogSetup });
          qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
        }}
      />
      <MeasurementsDialog
        key={`measure-${measuring?.id ?? "closed"}`}
        test={measuring}
        initial={measuring ? setupQueries.data?.[measuring.id] : undefined}
        onClose={() => setMeasuring(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lab", "setup"] })}
      />
    </div>
  );
}

function TestDialog({ test, onClose, onSaved }: { test: ClinicalServiceDto | "new" | null; onClose: () => void; onSaved: () => void }) {
  const isNew = test === "new";
  const [form, setForm] = useState(() =>
    test && test !== "new"
      ? {
          serviceCode: test.serviceCode,
          serviceName: test.serviceName,
          nhisTariffCode: test.nhisTariffCode ?? "",
          description: test.description ?? "",
          active: test.active,
          labResultPanel: ((test.labResultPanel as LabResultPanelCode) || "NONE") as LabResultPanelCode,
        }
      : EMPTY_TEST,
  );

  const saveMut = useMutation({
    mutationFn: () =>
      isNew
        ? clinicalService.createLabCatalogItem({
            serviceCode: form.serviceCode.trim(),
            serviceName: form.serviceName.trim(),
            nhisTariffCode: form.nhisTariffCode.trim() || undefined,
            description: form.description.trim() || undefined,
            active: true,
            labResultPanel: form.labResultPanel,
          })
        : clinicalService.updateLabCatalogItem((test as ClinicalServiceDto).id, {
            serviceName: form.serviceName.trim(),
            serviceGroup: "LAB",
            nhisTariffCode: form.nhisTariffCode.trim(),
            description: form.description.trim(),
            active: form.active,
            labResultPanel: form.labResultPanel,
          }),
    onSuccess: () => {
      onSaved();
      toast.success(isNew ? "Test added. Set its price in Prices and revenue." : "Test updated.");
      onClose();
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open={test !== null}
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={isNew ? "Add a test" : `Edit ${form.serviceName || "test"}`}
      description={isNew ? "Doctors can order it straight away. Its price is set in Prices and revenue." : "Changes apply to new requests straight away."}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saveMut.isPending || !form.serviceName.trim() || (isNew && !form.serviceCode.trim())}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {isNew ? "Add test" : "Save changes"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="Test">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="test-name">Name</Label>
          <Input id="test-name" value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="e.g. Serum potassium" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="test-code">Short code</Label>
          <Input
            id="test-code"
            value={form.serviceCode}
            disabled={!isNew}
            onChange={(e) => setForm({ ...form, serviceCode: e.target.value.toUpperCase() })}
            placeholder="e.g. LAB-K"
            className="font-clinical uppercase"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="test-nhis">NHIS code (optional)</Label>
          <Input id="test-nhis" value={form.nhisTariffCode} onChange={(e) => setForm({ ...form, nhisTariffCode: e.target.value })} className="font-clinical" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="test-desc">Description (optional)</Label>
          <Textarea id="test-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </FormDialogSection>
      <FormDialogSection title="Results">
        <div className="space-y-1.5">
          <Label htmlFor="test-panel">Result form</Label>
          <Select value={form.labResultPanel} onValueChange={(v) => setForm({ ...form, labResultPanel: v as LabResultPanelCode })}>
            <SelectTrigger id="test-panel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Standard results</SelectItem>
              <SelectItem value="MALARIA_PANEL">Malaria worksheet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isNew && (
          <div className="flex items-center gap-2 self-end pb-2">
            <Switch id="test-active" checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
            <Label htmlFor="test-active" className="text-sm font-normal">
              Offered (doctors can order it)
            </Label>
          </div>
        )}
      </FormDialogSection>
    </FormDialog>
  );
}

interface EditableRange {
  sex?: "M" | "F";
  fromAge: string;
  toAge: string;
  low: string;
  high: string;
}

type EditableParam = Omit<LabParameter, "ranges" | "criticalLow" | "criticalHigh"> & {
  key: string;
  choicesText: string;
  abnormalText: string;
  ranges: EditableRange[];
  criticalLow: string;
  criticalHigh: string;
};

const txt = (n: number | undefined) => (n == null ? "" : String(Number(n.toFixed(4))));
const num = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? undefined : Number(s));

function toEditable(p: LabParameter): EditableParam {
  const ranges = (p.ranges ?? []).map((r) => ({ sex: r.sex, fromAge: txt(r.fromAge), toAge: txt(r.toAge), low: txt(r.low), high: txt(r.high) }));
  return {
    name: p.name,
    unit: p.unit,
    kind: p.kind,
    choices: p.choices,
    abnormalChoices: p.abnormalChoices,
    key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Math.random()}`,
    choicesText: (p.choices ?? []).join(", "),
    abnormalText: (p.abnormalChoices ?? []).join(", "),
    ranges: ranges.length > 0 ? ranges : p.kind === "number" ? [{ fromAge: "", toAge: "", low: "", high: "" }] : [],
    criticalLow: txt(p.criticalLow),
    criticalHigh: txt(p.criticalHigh),
  };
}

/** Plain-language problems that would make the flags wrong. */
function problemsIn(params: EditableParam[]): string[] {
  const out: string[] = [];
  for (const p of params.filter((x) => x.name.trim())) {
    if (p.kind !== "number") continue;
    const bad = (v: string) => v.trim() !== "" && num(v) === undefined;
    for (const r of p.ranges) {
      if ([r.fromAge, r.toAge, r.low, r.high].some(bad)) out.push(`${p.name}: use numbers only in the ranges.`);
      const lo = num(r.low);
      const hi = num(r.high);
      if (lo != null && hi != null && lo > hi) out.push(`${p.name}: a normal low is above its normal high.`);
      const fa = num(r.fromAge);
      const ta = num(r.toAge);
      if (fa != null && ta != null && fa >= ta) out.push(`${p.name}: a "from age" isn't below its "up to age".`);
    }
    if (bad(p.criticalLow) || bad(p.criticalHigh)) out.push(`${p.name}: use numbers only for the critical limits.`);
    const cl = num(p.criticalLow);
    const ch = num(p.criticalHigh);
    const lows = p.ranges.map((r) => num(r.low)).filter((x): x is number => x != null);
    const highs = p.ranges.map((r) => num(r.high)).filter((x): x is number => x != null);
    if (cl != null && lows.some((l) => cl > l)) out.push(`${p.name}: "critical below" should be under the normal low.`);
    if (ch != null && highs.some((h) => ch < h)) out.push(`${p.name}: "critical above" should be over the normal high.`);
  }
  return [...new Set(out)];
}

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function MeasurementsDialog({
  test,
  initial,
  onClose,
  onSaved,
}: {
  test: ClinicalServiceDto | null;
  initial: LabTestSetup | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sampleType, setSampleType] = useState(initial?.sampleType ?? "");
  const [params, setParams] = useState<EditableParam[]>(() => (initial?.parameters ?? []).map(toEditable));

  const saveMut = useMutation({
    mutationFn: () =>
      labService.saveSetup({
        serviceId: test!.id,
        sampleType: sampleType.trim(),
        parameters: params
          .filter((p) => p.name.trim())
          .map(
            (p): LabParameter => ({
              name: p.name.trim(),
              unit: p.unit.trim(),
              kind: p.kind,
              criticalLow: p.kind === "number" ? num(p.criticalLow) : undefined,
              criticalHigh: p.kind === "number" ? num(p.criticalHigh) : undefined,
              choices: p.kind === "choice" ? splitList(p.choicesText) : undefined,
              abnormalChoices: p.kind === "choice" ? splitList(p.abnormalText) : undefined,
              ranges:
                p.kind === "number"
                  ? p.ranges
                      .map((r) => ({ sex: r.sex, fromAge: num(r.fromAge), toAge: num(r.toAge), low: num(r.low), high: num(r.high) }))
                      .filter((r) => r.low != null || r.high != null)
                  : undefined,
            }),
          ),
      }),
    onSuccess: () => {
      onSaved();
      toast.success("Measurements saved.");
      onClose();
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const patch = (key: string, p: Partial<EditableParam>) => setParams((all) => all.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const patchRange = (key: string, i: number, r: Partial<EditableRange>) =>
    setParams((all) => all.map((x) => (x.key === key ? { ...x, ranges: x.ranges.map((y, j) => (j === i ? { ...y, ...r } : y)) } : x)));
  const problems = problemsIn(params);

  return (
    <FormDialog
      open={test !== null}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={`What ${test?.serviceName ?? "this test"} measures`}
      description="Used to show normal ranges and flag low, high and critical results as the lab types them."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saveMut.isPending || problems.length > 0} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save measurements
          </Button>
        </>
      }
    >
      <InlineNotice tone="warning" title="Check these against your own analyser.">
        The ranges filled in for common tests are typical suggestions, not your lab&apos;s validated values. A lab scientist should confirm or correct them before relying on the flags.
      </InlineNotice>

      {problems.length > 0 && (
        <InlineNotice tone="error" title="Fix these before saving">
          <ul className="list-disc pl-4">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </InlineNotice>
      )}

      <FormDialogSection title="Sample">
        <div className="space-y-1.5">
          <Label htmlFor="setup-sample">Sample type</Label>
          <Input id="setup-sample" value={sampleType} onChange={(e) => setSampleType(e.target.value)} placeholder="e.g. Whole blood (EDTA)" />
        </div>
      </FormDialogSection>

      <FormDialogSection title="Measurements" columns={1}>
        {params.length === 0 && <p className="text-sm text-muted-foreground">Nothing set up yet. Add what this test measures.</p>}
        <ul className="space-y-3">
          {params.map((p, idx) => (
            <li key={p.key} className="space-y-3 rounded-lg border border-border bg-surface-subtle p-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor={`p-name-${idx}`}>Measured</Label>
                  <Input id={`p-name-${idx}`} value={p.name} onChange={(e) => patch(p.key, { name: e.target.value })} placeholder="e.g. Haemoglobin" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`p-kind-${idx}`}>Result is</Label>
                  <Select value={p.kind} onValueChange={(v) => patch(p.key, { kind: v as LabParameter["kind"], ranges: v === "number" && !p.ranges.length ? [{ fromAge: "", toAge: "", low: "", high: "" }] : p.ranges })}>
                    <SelectTrigger id={`p-kind-${idx}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">A number</SelectItem>
                      <SelectItem value="choice">A choice (e.g. Positive)</SelectItem>
                      <SelectItem value="text">Free text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`p-unit-${idx}`}>Unit</Label>
                  <Input id={`p-unit-${idx}`} value={p.unit} onChange={(e) => patch(p.key, { unit: e.target.value })} placeholder="e.g. g/dL" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="self-end"
                  aria-label={`Remove ${p.name || "this measurement"}`}
                  onClick={() => setParams((all) => all.filter((x) => x.key !== p.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {p.kind === "choice" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`p-choices-${idx}`}>Answers (comma-separated)</Label>
                    <Input id={`p-choices-${idx}`} value={p.choicesText} onChange={(e) => patch(p.key, { choicesText: e.target.value })} placeholder="Negative, Positive" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`p-abn-${idx}`}>Abnormal answers</Label>
                    <Input id={`p-abn-${idx}`} value={p.abnormalText} onChange={(e) => patch(p.key, { abnormalText: e.target.value })} placeholder="Positive" />
                  </div>
                </div>
              )}

              {p.kind === "number" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Normal ranges — the first line that fits the patient is used. Leave ages blank for all ages.</p>
                  {p.ranges.length > 0 && (
                    <div className="hidden gap-2 text-xs text-muted-foreground sm:grid sm:grid-cols-[repeat(5,minmax(0,1fr))_2.25rem]">
                      <span>Sex</span>
                      <span>From age (years)</span>
                      <span>Up to age (years)</span>
                      <span>Normal low</span>
                      <span>Normal high</span>
                    </div>
                  )}
                  {p.ranges.map((r, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_2.25rem]">
                      <Select value={r.sex ?? "ANY"} onValueChange={(v) => patchRange(p.key, i, { sex: v === "ANY" ? undefined : (v as "M" | "F") })}>
                        <SelectTrigger aria-label="Sex" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ANY">Any sex</SelectItem>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input aria-label="From age (years)" placeholder="From age" inputMode="decimal" value={r.fromAge} onChange={(e) => patchRange(p.key, i, { fromAge: e.target.value })} className="font-clinical" />
                      <Input aria-label="Up to age (years)" placeholder="To age" inputMode="decimal" value={r.toAge} onChange={(e) => patchRange(p.key, i, { toAge: e.target.value })} className="font-clinical" />
                      <Input aria-label="Normal low" placeholder="Low" inputMode="decimal" value={r.low} onChange={(e) => patchRange(p.key, i, { low: e.target.value })} className="font-clinical" />
                      <Input aria-label="Normal high" placeholder="High" inputMode="decimal" value={r.high} onChange={(e) => patchRange(p.key, i, { high: e.target.value })} className="font-clinical" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove this range"
                        onClick={() => patch(p.key, { ranges: p.ranges.filter((_, j) => j !== i) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="secondary" onClick={() => patch(p.key, { ranges: [...p.ranges, { fromAge: "", toAge: "", low: "", high: "" }] })}>
                    <Plus className="mr-1 h-4 w-4" /> Add a range
                  </Button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`p-clow-${idx}`}>Critical below (optional)</Label>
                      <Input id={`p-clow-${idx}`} inputMode="decimal" value={p.criticalLow} onChange={(e) => patch(p.key, { criticalLow: e.target.value })} className="font-clinical" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`p-chigh-${idx}`}>Critical above (optional)</Label>
                      <Input id={`p-chigh-${idx}`} inputMode="decimal" value={p.criticalHigh} onChange={(e) => patch(p.key, { criticalHigh: e.target.value })} className="font-clinical" />
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() => setParams((all) => [...all, toEditable({ name: "", unit: "", kind: "number" })])}
        >
          <Plus className="mr-1 h-4 w-4" /> Add a measurement
        </Button>
      </FormDialogSection>
    </FormDialog>
  );
}
