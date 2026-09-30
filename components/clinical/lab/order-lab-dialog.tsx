"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { isSelfPay, type LabUrgency } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

const URGENCIES: Array<{ value: LabUrgency; label: string; hint: string }> = [
  { value: "ROUTINE", label: "Routine", hint: "In the normal order" },
  { value: "URGENT", label: "Urgent", hint: "Ahead of routine tests" },
  { value: "STAT", label: "Immediately", hint: "Drop everything" },
];

interface OrderLabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  patientName: string;
  /** "CASH" shows the pay-first notice (J02). */
  payerType: string;
  /** Tests already requested on this visit and still open — shown as already requested. */
  alreadyRequested: string[];
}

/** DOC-05 — request lab tests; each goes straight to the lab's To do list. */
export function OrderLabDialog(props: OrderLabDialogProps) {
  if (!props.open) return null;
  return <OrderLabBody {...props} />;
}

function OrderLabBody({ open, onOpenChange, encounterId, patientName, payerType, alreadyRequested }: OrderLabDialogProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<LabUrgency>("ROUTINE");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const testsQuery = useQuery({
    queryKey: [...queryKeys.clinical.labCatalogSetup, "orderable"],
    queryFn: () => clinicalService.catalog("LAB", true),
    staleTime: 5 * 60_000,
  });

  const tests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (testsQuery.data ?? [])
      .filter((t) => !q || t.serviceName.toLowerCase().includes(q) || t.serviceCode.toLowerCase().includes(q))
      .sort((a, b) => a.serviceName.localeCompare(b.serviceName));
  }, [testsQuery.data, search]);

  const sendMut = useMutation({
    mutationFn: async () => {
      let sent = 0;
      for (const serviceId of selected) {
        try {
          await clinicalService.placeLabOrder(encounterId, {
            serviceId,
            priority: urgency,
            reason: reason.trim() || undefined,
            instructions: note.trim() || undefined,
          });
        } catch (e) {
          // Keep only the tests that still need sending, so "Send" again can't make duplicates.
          throw Object.assign(e instanceof Error ? e : new Error("send failed"), { sentBeforeFailure: sent });
        }
        sent += 1;
        setSelected((s) => s.filter((x) => x !== serviceId));
      }
      return sent;
    },
    onSuccess: (sent) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(`${sent} test${sent === 1 ? "" : "s"} sent to the lab.`);
      onOpenChange(false);
    },
    onError: (e) => {
      // Some may have gone through before the failure — refresh so the list shows what was sent.
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      const sent = (e as { sentBeforeFailure?: number }).sentBeforeFailure ?? 0;
      toast.error(
        sent > 0
          ? `${sent} test${sent === 1 ? "" : "s"} sent; the rest couldn't be sent. ${getFriendlyError(e).message}`
          : getFriendlyError(e).message,
      );
    },
  });

  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const selfPay = isSelfPay(payerType);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Order lab tests for ${patientName}`}
      description="The tests go straight to the lab's list."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selected.length === 0 || sendMut.isPending} onClick={() => sendMut.mutate()}>
            {sendMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            {selected.length > 1 ? `Send ${selected.length} tests to lab` : "Send to lab"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="Tests" columns={1}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search tests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests, e.g. malaria or blood count"
            className="pl-9"
          />
        </div>
        {testsQuery.isPending ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : testsQuery.isError ? (
          <ErrorState error={testsQuery.error} onRetry={() => void testsQuery.refetch()} />
        ) : tests.length === 0 ? (
          <EmptyState
            illustration="no-results"
            title={search ? "No test matches your search" : "No lab tests set up yet"}
            description={search ? "Try another word." : "Ask the lab to add the tests they offer in Laboratory → Tests and settings."}
          />
        ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {tests.map((t) => {
              const requested = alreadyRequested.includes(t.id);
              return (
                <ChoiceOption key={t.id} className="py-2">
                  <Checkbox
                    checked={selected.includes(t.id)}
                    onCheckedChange={(v) => toggle(t.id, v === true)}
                    aria-label={t.serviceName}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.serviceName}</span>
                    {requested && <span className="block text-xs font-normal text-warning">Already requested on this visit</span>}
                  </span>
                </ChoiceOption>
              );
            })}
          </div>
        )}
      </FormDialogSection>

      <FormDialogSection title="How soon" columns={1}>
        <RadioGroup aria-label="How soon" value={urgency} onValueChange={(v) => setUrgency(v as LabUrgency)} className="grid gap-2 sm:grid-cols-3">
          {URGENCIES.map((u) => (
            <ChoiceOption key={u.value} className="py-2">
              <RadioGroupItem value={u.value} />
              <span>
                <span className="block text-sm font-medium">{u.label}</span>
                <span className="block text-xs font-normal text-muted-foreground">{u.hint}</span>
              </span>
            </ChoiceOption>
          ))}
        </RadioGroup>
      </FormDialogSection>

      <FormDialogSection title="For the lab">
        <div className="space-y-1.5">
          <label htmlFor="lab-reason" className="text-sm font-medium text-foreground">
            Clinical question (optional)
          </label>
          <Textarea id="lab-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Rule out malaria" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lab-note" className="text-sm font-medium text-foreground">
            Note to the lab (optional)
          </label>
          <Textarea id="lab-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Patient fasting since midnight" />
        </div>
      </FormDialogSection>

      {selfPay && (
        <InlineNotice tone="info">{patientName} pays at the cashier before the sample is taken.</InlineNotice>
      )}
    </FormDialog>
  );
}
