"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { isSelfPay } from "@/lib/lab-results";
import { allergyClash, FREQUENCIES, frequencyLabel, ROUTES, stockStatus, suggestedQuantity } from "@/lib/pharmacy";
import { canReadStock } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { patientsService } from "@/services/patients.service";
import { pharmacyInventoryService } from "@/services/pharmacy-inventory.service";
import { useAuthStore } from "@/store/auth.store";
import type { ClinicalServiceDto, CreatePrescriptionLineInput } from "@/types/clinical.types";

interface DraftLine {
  key: string;
  service: ClinicalServiceDto;
  strength: string;
  dosePerTime: string;
  frequency: string;
  days: string;
  route: string;
  quantity: string;
  quantityEdited: boolean;
  instructions: string;
  /** Set when the doctor chose to prescribe despite a group allergy warning. */
  overrideReason: string;
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Math.random()}`);

interface PrescribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  patientId: string;
  patientName: string;
  payerType: string;
}

/** DOC-07 — prescribe safely: allergy clashes can't be missed or dismissed silently. */
export function PrescribeDialog(props: PrescribeDialogProps) {
  if (!props.open) return null;
  return <Body {...props} />;
}

function Body({ open, onOpenChange, encounterId, patientId, patientName, payerType }: PrescribeDialogProps) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [note, setNote] = useState("");

  const drugsQuery = useQuery({
    queryKey: ["clinical", "catalog", "PHARMACY"],
    queryFn: () => clinicalService.catalog("PHARMACY"),
    staleTime: 5 * 60_000,
  });
  const stockQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.overview("true"),
    queryFn: () => pharmacyInventoryService.stockOverview(true),
    enabled: canReadStock(role),
    staleTime: 60_000,
  });
  const itemsQuery = useQuery({
    queryKey: queryKeys.pharmacyInventory.items("true"),
    queryFn: () => pharmacyInventoryService.listInventoryItems(true),
    enabled: canReadStock(role),
    staleTime: 60_000,
  });
  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => patientsService.getById(patientId),
  });
  const alertsQuery = useQuery({
    queryKey: queryKeys.clinical.alerts(patientId),
    queryFn: () => clinicalService.listAlerts(patientId),
  });

  /** Stock status for a catalogue drug, when this role may see stock. */
  const stockFor = (serviceId: string) => {
    const item = (itemsQuery.data ?? []).find((i) => i.catalogServiceId === serviceId);
    if (!item) return null;
    return (stockQuery.data ?? []).find((r) => r.itemId === item.id) ?? null;
  };

  const drugs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (drugsQuery.data ?? [])
      .filter((d) => !q || d.serviceName.toLowerCase().includes(q) || d.serviceCode.toLowerCase().includes(q))
      .sort((a, b) => a.serviceName.localeCompare(b.serviceName))
      .slice(0, 12);
  }, [drugsQuery.data, search]);

  const clashFor = (name: string) => allergyClash(name, alertsQuery.data ?? [], patientQuery.data?.knownAllergies);

  function addDrug(d: ClinicalServiceDto) {
    setLines((ls) => [
      ...ls,
      {
        key: newKey(),
        service: d,
        strength: "",
        dosePerTime: "1",
        frequency: "TDS",
        days: "5",
        route: ROUTES[0],
        quantity: String(suggestedQuantity(1, "TDS", 5) ?? ""),
        quantityEdited: false,
        instructions: "",
        overrideReason: "",
      },
    ]);
    setSearch("");
  }

  function patch(key: string, p: Partial<DraftLine>) {
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...p };
        // Keep the quantity worked out from dose × how often × days until the doctor types their own.
        if (!next.quantityEdited && ("dosePerTime" in p || "frequency" in p || "days" in p)) {
          const q = suggestedQuantity(Number(next.dosePerTime), next.frequency, Number(next.days));
          next.quantity = q != null ? String(q) : next.quantity;
        }
        return next;
      }),
    );
  }

  const problems = lines.flatMap((l) => {
    const out: string[] = [];
    const clash = clashFor(l.service.serviceName);
    if (clash?.blocking) out.push(`${l.service.serviceName} clashes with the recorded allergy "${clash.allergy}".`);
    if (clash && !clash.blocking && !l.overrideReason.trim()) out.push(`Say why ${l.service.serviceName} is safe despite the allergy, or remove it.`);
    if (!(Number(l.quantity) > 0)) out.push(`Enter the quantity for ${l.service.serviceName}.`);
    return out;
  });

  const sendMut = useMutation({
    mutationFn: () => {
      const payload: CreatePrescriptionLineInput[] = lines.map((l) => ({
        serviceId: l.service.id,
        drugName: l.service.serviceName,
        strength: l.strength.trim() || undefined,
        route: l.route,
        frequency: l.frequency,
        durationDays: Number(l.days) || undefined,
        quantity: Number(l.quantity),
        instructions:
          [
            l.dosePerTime ? `${l.dosePerTime} at a time, ${frequencyLabel(l.frequency).toLowerCase()}` : "",
            l.instructions.trim(),
            l.overrideReason.trim() ? `Allergy checked by prescriber: ${l.overrideReason.trim()}` : "",
          ]
            .filter(Boolean)
            .join(". ") || undefined,
      }));
      return clinicalService.placePrescription(encounterId, { notes: note.trim() || undefined, lines: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(`${lines.length} medicine${lines.length === 1 ? "" : "s"} sent to the pharmacy.`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={`Prescribe for ${patientName}`}
      description="Add each medicine, then send them all to the pharmacy."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={lines.length === 0 || problems.length > 0 || sendMut.isPending} onClick={() => sendMut.mutate()}>
            {sendMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Send to pharmacy
          </Button>
        </>
      }
    >
      <FormDialogSection title="Add a medicine" columns={1}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search medicines" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines, e.g. paracetamol" className="pl-9" />
        </div>
        {drugsQuery.isError ? (
          <InlineNotice tone="error">{getFriendlyError(drugsQuery.error).message}</InlineNotice>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {drugs.map((d) => {
              const stock = stockFor(d.id);
              const clash = clashFor(d.serviceName);
              const already = lines.some((l) => l.service.id === d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={already}
                  onClick={() => addDrug(d)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{d.serviceName}</span>
                    {clash && <span className="block text-xs text-destructive">Allergy: {clash.allergy}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {stock && <StatusPill tone={stockStatus(stock.stockStatus).tone}>{stockStatus(stock.stockStatus).label}</StatusPill>}
                    {already ? <span className="text-xs text-muted-foreground">Added</span> : <Plus className="h-4 w-4 text-muted-foreground" />}
                  </span>
                </button>
              );
            })}
            {!drugsQuery.isPending && drugs.length === 0 && (
              <p className="text-sm text-muted-foreground">No medicine matches &ldquo;{search}&rdquo;.</p>
            )}
          </div>
        )}
      </FormDialogSection>

      {lines.length > 0 && (
        <FormDialogSection title={`Medicines to send (${lines.length})`} columns={1}>
          <ul className="space-y-3">
            {lines.map((l) => {
              const clash = clashFor(l.service.serviceName);
              return (
                <li key={l.key} className="space-y-3 rounded-lg border border-border bg-surface-subtle p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{l.service.serviceName}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${l.service.serviceName}`}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {clash && (
                    <div className="alert-critical space-y-2 rounded-lg border px-3 py-2" role="alert">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Allergy: {clash.allergy}
                      </p>
                      {clash.blocking ? (
                        <p className="text-sm">
                          This medicine matches the patient&apos;s allergy and can&apos;t be sent. Choose another medicine. If the allergy is
                          wrong, remove it from the patient&apos;s Alerts first.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-sm">This medicine may clash with the allergy. Choose another, or say why it&apos;s safe.</p>
                          <Textarea
                            aria-label={`Why ${l.service.serviceName} is safe`}
                            rows={2}
                            value={l.overrideReason}
                            onChange={(e) => patch(l.key, { overrideReason: e.target.value })}
                            placeholder="Prescribe anyway — I've checked because…"
                            className="bg-card"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <label htmlFor={`rx-dose-${l.key}`} className="text-xs font-medium text-foreground">
                        Dose each time
                      </label>
                      <Input id={`rx-dose-${l.key}`} inputMode="decimal" value={l.dosePerTime} onChange={(e) => patch(l.key, { dosePerTime: e.target.value })} className="font-clinical" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`rx-strength-${l.key}`} className="text-xs font-medium text-foreground">
                        Strength (optional)
                      </label>
                      <Input id={`rx-strength-${l.key}`} value={l.strength} onChange={(e) => patch(l.key, { strength: e.target.value })} placeholder="e.g. 500 mg" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`rx-days-${l.key}`} className="text-xs font-medium text-foreground">
                        For how many days
                      </label>
                      <Input id={`rx-days-${l.key}`} inputMode="numeric" value={l.days} onChange={(e) => patch(l.key, { days: e.target.value.replace(/\D/g, "") })} className="font-clinical" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`rx-qty-${l.key}`} className="text-xs font-medium text-foreground">
                        Quantity to give
                      </label>
                      <Input
                        id={`rx-qty-${l.key}`}
                        inputMode="numeric"
                        value={l.quantity}
                        onChange={(e) => patch(l.key, { quantity: e.target.value.replace(/[^\d.]/g, ""), quantityEdited: true })}
                        className="font-clinical"
                      />
                    </div>
                  </div>

                  <RadioGroup
                    aria-label={`How often to take ${l.service.serviceName}`}
                    value={l.frequency}
                    onValueChange={(v) => patch(l.key, { frequency: v })}
                    className="flex flex-wrap gap-2"
                  >
                    {FREQUENCIES.map((f) => (
                      <ChoiceOption key={f.code} className="py-1.5">
                        <RadioGroupItem value={f.code} />
                        {f.label}
                      </ChoiceOption>
                    ))}
                  </RadioGroup>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`rx-route-${l.key}`} className="text-xs font-medium text-foreground">
                        How it&apos;s taken
                      </label>
                      <Select value={l.route} onValueChange={(v) => patch(l.key, { route: v })}>
                        <SelectTrigger id={`rx-route-${l.key}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROUTES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`rx-instr-${l.key}`} className="text-xs font-medium text-foreground">
                        Instructions for the patient (optional)
                      </label>
                      <Input id={`rx-instr-${l.key}`} value={l.instructions} onChange={(e) => patch(l.key, { instructions: e.target.value })} placeholder="e.g. After meals" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </FormDialogSection>
      )}

      {lines.length > 0 && (
        <FormDialogSection title="For the pharmacy" columns={1}>
          <label htmlFor="rx-note" className="sr-only">
            Note to the pharmacy
          </label>
          <Textarea id="rx-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the pharmacy (optional)" />
          {isSelfPay(payerType) && <InlineNotice tone="info">{patientName} pays at the cashier before collecting the medicines.</InlineNotice>}
        </FormDialogSection>
      )}

      {problems.length > 0 && (
        <InlineNotice tone="error" title="Before sending">
          <ul className="list-disc pl-4">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </InlineNotice>
      )}
      {!canReadStock(role) && lines.length === 0 && (
        <p className="text-xs text-muted-foreground">Stock levels aren&apos;t shown here yet — the pharmacy will tell you if something is out of stock.</p>
      )}
    </FormDialog>
  );
}

