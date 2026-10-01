"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useWardBoard } from "@/components/wards/use-ward-board";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { BED_KINDS, bedKey, bedKindLabel, bedState, WARD_FOR, WARD_KINDS, wardForLabel, wardKindLabel } from "@/lib/wards";
import { ipdService } from "@/services/ipd.service";
import type { BedKind, ConfiguredBed, ConfiguredWard, WardFor, WardKind } from "@/types/ipd.types";

const SETUP_KEY = ["ipd", "setup"] as const;

/** Facility settings → Wards and beds: the wards, their beds and what each bed is. */
export function WardsSetupView() {
  const qc = useQueryClient();
  const editable = ipdService.wardSetupAvailable();
  const wardsQuery = useQuery({ queryKey: SETUP_KEY, queryFn: () => ipdService.listConfiguredWards() });
  const serverQuery = useQuery({ queryKey: [...queryKeys.ipd.wards, "server"], queryFn: () => ipdService.board(), enabled: editable });
  const board = useWardBoard();
  const [editingWard, setEditingWard] = useState<ConfiguredWard | "new" | null>(null);
  const [addingTo, setAddingTo] = useState<ConfiguredWard | null>(null);
  const [editingBed, setEditingBed] = useState<{ ward: ConfiguredWard; bed: ConfiguredBed } | null>(null);
  const [open, setOpen] = useState<string[]>([]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: SETUP_KEY });
    void qc.invalidateQueries({ queryKey: queryKeys.ipd.wards });
  };

  const toggleWard = useMutation({
    mutationFn: (w: ConfiguredWard) => ipdService.saveWard({ ...w, active: !w.active }),
    onSuccess: (w) => {
      refresh();
      toast.success(w.active ? `${w.name} is in use again.` : `${w.name} is switched off. It won't be offered for admissions.`);
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  // Who is in each bed now, to stop switching off a bed or ward that's in use.
  const inUse = new Set(board.wards.flatMap((w) => w.beds.filter((b) => b.state === "OCCUPIED" || b.state === "GOING_HOME").map((b) => b.key)));
  const serverHasWards = (serverQuery.data?.wards.length ?? 0) > 0;

  if (wardsQuery.isPending) return <CardSkeleton />;
  if (wardsQuery.isError) return <ErrorState error={wardsQuery.error} onRetry={() => void wardsQuery.refetch()} />;
  const wards = wardsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {!editable ? (
        <InlineNotice tone="info">Setting up wards here isn&apos;t available yet. The wards below come from the system set-up.</InlineNotice>
      ) : serverHasWards ? (
        <InlineNotice tone="warning">This hospital&apos;s wards are already set up on the server, so the wards below (sample data) aren&apos;t used.</InlineNotice>
      ) : (
        <InlineNotice tone="info">Wards set up here are kept on this computer (sample data) until ward set-up is available on the server. The Wards section uses them.</InlineNotice>
      )}

      {editable && (
        <div className="flex justify-end">
          <Button onClick={() => setEditingWard("new")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add ward
          </Button>
        </div>
      )}

      {wards.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="empty-list"
            title="No wards yet"
            description="Add each ward and its beds. Doctors then admit patients to them, and nurses see them in Wards."
            action={editable ? { label: "Add ward", onClick: () => setEditingWard("new") } : undefined}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {wards.map((w) => {
            const activeBeds = w.beds.filter((b) => b.active);
            const used = activeBeds.filter((b) => inUse.has(bedKey(w.name, b.label))).length;
            const isOpen = open.includes(w.id);
            return (
              <li key={w.id} className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => (isOpen ? o.filter((x) => x !== w.id) : [...o, w.id]))}
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">
                        {w.name} <span className="font-clinical text-xs font-normal text-muted-foreground">{w.code}</span>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[...new Set([wardKindLabel(w.kind), wardForLabel(w.for)]), w.floor].filter(Boolean).join(" · ")} · {activeBeds.length} bed{activeBeds.length === 1 ? "" : "s"}, {used} in use
                      </span>
                    </span>
                  </button>
                  <StatusPill tone={w.active ? "success" : "neutral"}>{w.active ? "In use" : "Switched off"}</StatusPill>
                  {editable && (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => setAddingTo(w)}>
                        Add beds
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingWard(w)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={toggleWard.isPending || (w.active && used > 0)}
                        title={w.active && used > 0 ? "Patients are in this ward" : undefined}
                        onClick={() => toggleWard.mutate(w)}
                      >
                        {w.active ? "Switch off" : "Switch on"}
                      </Button>
                    </div>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    {w.beds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No beds yet.{editable ? " Use Add beds." : ""}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                              <th className="py-2 pr-3 font-medium">Bed</th>
                              <th className="py-2 pr-3 font-medium">Type</th>
                              <th className="py-2 pr-3 font-medium">Now</th>
                              <th className="py-2 pr-3 font-medium">Notes</th>
                              <th className="w-20" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {w.beds.map((b) => {
                              const live = board.wards.find((x) => x.name === w.name)?.beds.find((x) => x.label === b.label);
                              const st = live ? bedState(live.state) : null;
                              return (
                                <tr key={b.id} className={b.active ? "" : "text-muted-foreground"}>
                                  <td className="py-1.5 pr-3 font-clinical">
                                    <BedDouble className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                    {b.label}
                                  </td>
                                  <td className="py-1.5 pr-3">{bedKindLabel(b.kind)}</td>
                                  <td className="py-1.5 pr-3">{!b.active || !w.active ? <StatusPill tone="neutral">Switched off</StatusPill> : st ? <StatusPill tone={st.tone}>{st.label}</StatusPill> : "—"}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{b.notes || ""}</td>
                                  <td className="py-1.5 text-right">
                                    {editable && (
                                      <Button size="sm" variant="ghost" onClick={() => setEditingBed({ ward: w, bed: b })}>
                                        Edit
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editingWard && (
        <WardDialog
          ward={editingWard === "new" ? null : editingWard}
          existing={wards}
          inUse={editingWard !== "new" && editingWard.beds.some((b) => inUse.has(bedKey(editingWard.name, b.label)))}
          onClose={() => setEditingWard(null)}
          onSaved={refresh}
        />
      )}
      {addingTo && <AddBedsDialog ward={addingTo} onClose={() => setAddingTo(null)} onSaved={refresh} />}
      {editingBed && (
        <BedDialog ward={editingBed.ward} bed={editingBed.bed} inUse={inUse.has(bedKey(editingBed.ward.name, editingBed.bed.label))} onClose={() => setEditingBed(null)} onSaved={refresh} />
      )}
    </div>
  );
}

/** Bed numbers "FM-01 … FM-08" from a prefix, start and count. */
function bedLabels(prefix: string, from: number, count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => (prefix ? `${prefix}-${String(from + i).padStart(2, "0")}` : String(from + i)));
}

function WardDialog({ ward, existing, inUse, onClose, onSaved }: { ward: ConfiguredWard | null; existing: ConfiguredWard[]; inUse: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(ward?.name ?? "");
  const [code, setCode] = useState(ward?.code ?? "");
  const [kind, setKind] = useState<WardKind>(ward?.kind ?? "GENERAL");
  const [forWho, setFor] = useState<WardFor>(ward?.for ?? "MIXED");
  const [floor, setFloor] = useState(ward?.floor ?? "");
  const [notes, setNotes] = useState(ward?.notes ?? "");
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("10");
  const [bedKind, setBedKind] = useState<BedKind>("STANDARD");

  const duplicate = existing.some((w) => w.id !== ward?.id && w.name.trim().toLowerCase() === name.trim().toLowerCase());
  const n = Number(count) || 0;
  const valid = Boolean(name.trim()) && Boolean(code.trim()) && !duplicate && (Boolean(ward) || (n >= 0 && n <= 200));

  const mut = useMutation({
    mutationFn: () =>
      ipdService.saveWard({
        id: ward?.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        kind,
        for: forWho,
        floor: floor.trim(),
        notes: notes.trim(),
        active: ward?.active ?? true,
        beds: ward ? undefined : bedLabels(prefix.trim() || code.trim().toUpperCase(), 1, n).map((label) => ({ id: `b-${Math.random().toString(36).slice(2, 10)}`, label, kind: bedKind, notes: "", active: true })),
      }),
    onSuccess: (w) => {
      onSaved();
      toast.success(ward ? `${w.name} updated.` : `${w.name} added with ${w.beds.length} bed${w.beds.length === 1 ? "" : "s"}.`);
      onClose();
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !mut.isPending && onClose()}
      size="lg"
      title={ward ? `Edit ${ward.name}` : "Add a ward"}
      description={ward ? "The ward's details. Beds are changed one by one from the ward's list." : "The ward and its first beds. You can add more beds later."}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {ward ? "Save changes" : "Add ward"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="The ward">
        <div className="space-y-1.5">
          <Label htmlFor="ward-name">Name</Label>
          <Input id="ward-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Female Surgical Ward" aria-invalid={duplicate} disabled={inUse} />
          {inUse && <p className="text-xs text-muted-foreground">Can&apos;t be renamed while patients are in it.</p>}
          {duplicate && <p className="text-xs text-destructive">There is already a ward with this name.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ward-code">Short code</Label>
          <Input id="ward-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-clinical" placeholder="e.g. FSW" maxLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ward-kind">Type of ward</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as WardKind)}>
            <SelectTrigger id="ward-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WARD_KINDS.map((k) => (
                <SelectItem key={k.code} value={k.code}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ward-for">For</Label>
          <Select value={forWho} onValueChange={(v) => setFor(v as WardFor)}>
            <SelectTrigger id="ward-for" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WARD_FOR.map((k) => (
                <SelectItem key={k.code} value={k.code}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ward-floor">Where it is (optional)</Label>
          <Input id="ward-floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. Block B, first floor" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ward-notes">Notes (optional)</Label>
          <Textarea id="ward-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </FormDialogSection>
      {!ward && (
        <FormDialogSection title="Beds">
          <div className="space-y-1.5">
            <Label htmlFor="ward-beds">Number of beds</Label>
            <Input id="ward-beds" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} className="w-28 font-clinical" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ward-prefix">Bed number starts with (optional)</Label>
            <Input id="ward-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className="font-clinical" placeholder={code || "e.g. FS"} maxLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ward-bed-kind">Type of bed</Label>
            <Select value={bedKind} onValueChange={(v) => setBedKind(v as BedKind)}>
              <SelectTrigger id="ward-bed-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BED_KINDS.map((k) => (
                  <SelectItem key={k.code} value={k.code}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {n > 0 && (
            <p className="self-end text-xs text-muted-foreground">
              Beds {bedLabels(prefix.trim() || code.trim() || "B", 1, n)[0]} to {bedLabels(prefix.trim() || code.trim() || "B", 1, n)[n - 1]}
            </p>
          )}
        </FormDialogSection>
      )}
    </FormDialog>
  );
}

function AddBedsDialog({ ward, onClose, onSaved }: { ward: ConfiguredWard; onClose: () => void; onSaved: () => void }) {
  const lastNumber = Math.max(0, ...ward.beds.map((b) => Number(/(\d+)$/.exec(b.label)?.[1] ?? 0)));
  const guessPrefix = /^(.*)-\d+$/.exec(ward.beds[0]?.label ?? "")?.[1] ?? ward.code;
  const [prefix, setPrefix] = useState(guessPrefix);
  const [from, setFrom] = useState(String(lastNumber + 1));
  const [count, setCount] = useState("2");
  const [kind, setKind] = useState<BedKind>("STANDARD");
  const labels = bedLabels(prefix.trim(), Number(from) || 1, Number(count) || 0);
  const clashes = labels.filter((l) => ward.beds.some((b) => b.label.toLowerCase() === l.toLowerCase()));
  const valid = labels.length > 0 && labels.length <= 100 && clashes.length === 0;

  const mut = useMutation({
    mutationFn: () => ipdService.addBeds(ward.id, { prefix: prefix.trim(), from: Number(from) || 1, count: Number(count) || 0, kind }),
    onSuccess: () => {
      onSaved();
      toast.success(`${labels.length} bed${labels.length === 1 ? "" : "s"} added to ${ward.name}.`);
      onClose();
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !mut.isPending && onClose()}
      size="md"
      title={`Add beds to ${ward.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {labels.length === 1 ? "Add bed" : `Add ${labels.length} beds`}
          </Button>
        </>
      }
    >
      <FormDialogSection>
        <div className="space-y-1.5">
          <Label htmlFor="add-prefix">Bed number starts with</Label>
          <Input id="add-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className="font-clinical" maxLength={6} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-from">First number</Label>
          <Input id="add-from" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))} className="w-28 font-clinical" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-count">How many</Label>
          <Input id="add-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} className="w-28 font-clinical" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-kind">Type of bed</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as BedKind)}>
            <SelectTrigger id="add-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BED_KINDS.map((k) => (
                <SelectItem key={k.code} value={k.code}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs sm:col-span-2">
          {clashes.length > 0 ? (
            <span className="text-destructive">Already in this ward: {clashes.join(", ")}. Change the first number.</span>
          ) : labels.length > 0 ? (
            <span className="text-muted-foreground">
              New beds: {labels.slice(0, 8).join(", ")}
              {labels.length > 8 ? ` … ${labels[labels.length - 1]}` : ""}
            </span>
          ) : null}
        </p>
      </FormDialogSection>
    </FormDialog>
  );
}

function BedDialog({ ward, bed, inUse, onClose, onSaved }: { ward: ConfiguredWard; bed: ConfiguredBed; inUse: boolean; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(bed.label);
  const [kind, setKind] = useState<BedKind>(bed.kind);
  const [notes, setNotes] = useState(bed.notes);
  const [active, setActive] = useState(bed.active);
  const duplicate = ward.beds.some((b) => b.id !== bed.id && b.label.trim().toLowerCase() === label.trim().toLowerCase());

  const mut = useMutation({
    mutationFn: () => ipdService.saveBed(ward.id, { ...bed, label: label.trim(), kind, notes: notes.trim(), active }),
    onSuccess: () => {
      onSaved();
      toast.success(`Bed ${label.trim()} saved.`);
      onClose();
    },
    onError: (e) => notify.error(e instanceof Error && e.message === "DUPLICATE_BED" ? "There is already a bed with this number." : getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !mut.isPending && onClose()}
      size="md"
      title={`Bed ${bed.label}`}
      description={`${ward.name}${inUse ? " · a patient is in this bed" : ""}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button disabled={!label.trim() || duplicate || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save bed
          </Button>
        </>
      }
    >
      <FormDialogSection>
        <div className="space-y-1.5">
          <Label htmlFor="bed-label">Bed number</Label>
          <Input id="bed-label" value={label} onChange={(e) => setLabel(e.target.value.toUpperCase())} className="font-clinical" disabled={inUse} aria-invalid={duplicate} />
          {duplicate && <p className="text-xs text-destructive">There is already a bed with this number.</p>}
          {inUse && <p className="text-xs text-muted-foreground">Can&apos;t be renumbered while a patient is in it.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bed-kind">Type of bed</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as BedKind)}>
            <SelectTrigger id="bed-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BED_KINDS.map((k) => (
                <SelectItem key={k.code} value={k.code}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bed-notes">Notes (optional)</Label>
          <Input id="bed-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Near the nurses' station, has oxygen point" />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch id="bed-active" checked={active} onCheckedChange={setActive} disabled={inUse && active} />
          <Label htmlFor="bed-active" className="font-normal">
            In use{inUse && active ? " (a patient is in this bed, so it can't be switched off)" : ". Switched-off beds aren't offered for admissions."}
          </Label>
        </div>
      </FormDialogSection>
    </FormDialog>
  );
}
