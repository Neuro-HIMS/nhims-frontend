"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { MoneyInput } from "@/components/common/money-input";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { formatMoney, parseMoney } from "@/lib/billing";
import { formatClinicalDate, formatClinicalDateTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { billNumberFromClaim, claimEditable, claimStatus, NHIS_REASONS, notesWithReason } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { isAdmin } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { auditApiService } from "@/services/audit.service";
import { billingService } from "@/services/billing.service";
import { financeService } from "@/services/finance.service";
import { useAuthStore } from "@/store/auth.store";
import type { FinanceNhisClaimDto } from "@/types/finance.types";

interface DraftLine {
  key: string;
  serviceCode: string;
  description: string;
  tariffCode: string;
  quantity: string;
  unit: string;
}

let lineKey = 1;
const toDraft = (l: { serviceCode: string; description: string; tariffCode: string; quantity: number; unitAmountMinor: number }): DraftLine => ({
  key: `l${lineKey++}`,
  serviceCode: l.serviceCode ?? "",
  description: l.description ?? "",
  tariffCode: l.tariffCode ?? "",
  quantity: String(l.quantity ?? 1),
  unit: ((l.unitAmountMinor ?? 0) / 100).toFixed(2),
});

/** FIN-06 / FIN-07 / FIN-08 — check one claim, send it, record NHIS's answer, fix and resend. */
export function ClaimView() {
  const router = useRouter();
  const id = useSearchParams().get("claimId");
  const claimsQuery = useQuery({ queryKey: queryKeys.finance.claims, queryFn: () => financeService.listClaims() });
  const claim = claimsQuery.data?.find((c) => c.id === id) ?? null;

  const back = (
    <Button variant="ghost" size="sm" onClick={() => router.push("/finance?view=nhis-claims")}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to NHIS claims
    </Button>
  );
  if (claimsQuery.isPending) return <div className="space-y-4">{back}<CardSkeleton /></div>;
  if (claimsQuery.isError) return <div className="space-y-4">{back}<ErrorState error={claimsQuery.error} onRetry={() => void claimsQuery.refetch()} /></div>;
  if (!claim) return <div className="space-y-4">{back}<InlineNotice tone="warning">This claim couldn&apos;t be found. It may have been removed.</InlineNotice></div>;
  // Keyed on what can change on the server, so the form restarts from the saved claim after each step.
  return (
    <div className="space-y-4">
      {back}
      <ClaimEditor key={`${claim.id}-${claim.status}-${claim.updatedAt}`} claim={claim} />
    </div>
  );
}

function ClaimEditor({ claim }: { claim: FinanceNhisClaimDto }) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const admin = Boolean(role && isAdmin(role));
  // Once a claim has lines the server can't save changes to it (backend-gaps.md#FIN-08-edit-lines),
  // so lines and note are shown read-only instead of failing on save.
  const linesLocked = claimEditable(claim.status) && claim.lines.length > 0;
  const editable = claimEditable(claim.status) && !linesLocked;
  const s = claimStatus(claim.status);
  const reason = financeService.reasonFor(claim);
  const billNumber = billNumberFromClaim(claim);

  const [lines, setLines] = useState<DraftLine[]>(() => claim.lines.map(toDraft));
  const [notes, setNotes] = useState(() => (claim.notes ?? "").split("NHIS said:")[0].trim());
  const [answering, setAnswering] = useState(false);
  const [confirm, setConfirm] = useState<"SUBMITTED" | "DRAFT" | null>(null);

  const billQuery = useQuery({
    queryKey: queryKeys.billing.bills("ALL", billNumber ?? claim.patientPublicId),
    queryFn: () => billingService.listBills({ search: billNumber ?? claim.patientPublicId }),
  });
  const patientName = billQuery.data?.find((b) => b.patientPublicId === claim.patientPublicId)?.patientName;
  const servicesQuery = useQuery({ queryKey: queryKeys.finance.activeServices, queryFn: () => financeService.listServices(true), enabled: editable });
  const historyQuery = useQuery({ queryKey: queryKeys.audit.events, queryFn: () => auditApiService.listEvents({ limit: 300 }), enabled: admin });

  const lineErrors = lines.map((l) => (!l.description.trim() ? "Say what was given." : !(Number(l.quantity) >= 1) ? "Quantity must be 1 or more." : !Number.isFinite(parseMoney(l.unit)) ? "Enter the amount like 12.50." : null));
  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number.isFinite(parseMoney(l.unit)) ? parseMoney(l.unit) : 0), 0);
  const savedTotal = claim.amountMinor;
  const comparable = (ls: DraftLine[]) => JSON.stringify(ls.map((l) => [l.serviceCode, l.description, l.tariffCode, l.quantity, l.unit]));
  const dirty = comparable(lines) !== comparable(claim.lines.map(toDraft)) || notes !== (claim.notes ?? "").split("NHIS said:")[0].trim();
  const valid = lineErrors.every((e) => !e);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.finance.all });
    void qc.invalidateQueries({ queryKey: queryKeys.audit.events });
  };

  /** Saves lines and note, keeping the reference, dates and NHIS's reason as they are. */
  async function save(extraNotes?: string) {
    return financeService.updateClaim(claim.id, {
      patientPublicId: claim.patientPublicId,
      claimReference: claim.claimReference,
      amountMinor: lines.length ? total : claim.amountMinor,
      servicePeriodStart: claim.servicePeriodStart ?? undefined,
      servicePeriodEnd: claim.servicePeriodEnd ?? undefined,
      notes: extraNotes ?? (reason ? notesWithReason(notes, reason) : notes),
      lines: lines.map((l) => ({ serviceCode: l.serviceCode.trim(), description: l.description.trim(), tariffCode: l.tariffCode.trim(), quantity: Number(l.quantity), unitAmountMinor: parseMoney(l.unit) })),
    });
  }

  const saveMut = useMutation({
    mutationFn: () => save(),
    onSuccess: () => {
      invalidate();
      toast.success("Claim saved.");
    },
    onError: (e) => notify.error(saveError(e)),
  });

  const moveMut = useMutation({
    mutationFn: async (to: string) => {
      if (editable && dirty) await save();
      return financeService.patchClaimStatus(claim.id, to);
    },
    onSuccess: (c) => {
      invalidate();
      toast.success(c.status === "DRAFT" ? "Claim moved back to draft." : `Claim marked ${claimStatus(c.status).label.toLowerCase()}.`);
    },
    onError: (e) => notify.error(saveError(e)),
  });

  const fillMut = useMutation({
    mutationFn: async () => {
      const bill = (billQuery.data ?? []).find((b) => b.billNumber === billNumber);
      if (!bill) throw new Error("bill");
      const inv = await billingService.getInvoice(bill.id);
      const codes = new Map((servicesQuery.data ?? []).map((sv) => [sv.id, sv.nhisTariffCode] as const));
      return inv.bill.items
        .filter((it) => it.nhisCoveredMinor > 0)
        .map((it) => {
          const qty = Number(it.quantity) || 1;
          // Keep the claim equal to what NHIS covers on the bill: one line for the whole amount when it doesn't split evenly.
          const even = it.nhisCoveredMinor % qty === 0;
          return toDraft({
            serviceCode: it.serviceCode,
            description: even ? it.serviceName : `${it.serviceName} (${qty})`,
            tariffCode: (it.serviceId && codes.get(it.serviceId)) || "",
            quantity: even ? qty : 1,
            unitAmountMinor: even ? it.nhisCoveredMinor / qty : it.nhisCoveredMinor,
          });
        });
    },
    onSuccess: (filled) => {
      setLines(filled);
      toast.success(filled.length ? `${filled.length} NHIS-covered item${filled.length === 1 ? "" : "s"} added from the bill. Check them, then save.` : "The bill has no NHIS-covered items.");
    },
    onError: () => notify.error("The visit's bill couldn't be found here (only recent bills can be). Add the lines by hand."),
  });

  const history = (historyQuery.data ?? []).filter((e) => e.resourceId === claim.id).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const patch = (key: string, p: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-base font-semibold text-foreground">{patientName ? naturalName(patientName) : "NHIS claim"}</p>
          <p className="patient-id mt-0.5">
            {claim.patientPublicId} · Claim {claim.claimReference}
            {claim.servicePeriodStart ? ` · Visit ${formatClinicalDate(claim.servicePeriodStart)}` : ""}
          </p>
        </div>
        <StatusPill tone={s.tone}>{s.label}</StatusPill>
      </section>

      {reason && (claim.status === "REJECTED" || claim.status === "ACTION_REQUIRED") && (
        <InlineNotice tone="error" title={claim.status === "REJECTED" ? "NHIS rejected this claim" : "NHIS questioned this claim"}>
          {reason} {linesLocked ? "Note the correction on the paper claim, then resend." : "Fix the lines or add a supporting note, then resend."}
        </InlineNotice>
      )}
      {linesLocked && (
        <InlineNotice tone="info">
          The lines on this claim can&apos;t be changed here yet. If NHIS asked for a correction, make it on the paper claim, then resend.
        </InlineNotice>
      )}
      {claim.status === "PAID" && <InlineNotice tone="success">NHIS accepted this claim. It can&apos;t be changed.</InlineNotice>}

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">What&apos;s claimed</h2>
          {editable && (
            <div className="flex flex-wrap gap-2">
              {lines.length === 0 && billNumber && (
                <Button size="sm" variant="secondary" disabled={fillMut.isPending || billQuery.isPending || servicesQuery.isPending} onClick={() => fillMut.mutate()}>
                  {fillMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Add the NHIS items from bill {billNumber}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, toDraft({ serviceCode: "", description: "", tariffCode: "", quantity: 1, unitAmountMinor: 0 })])}>
                <Plus className="mr-1.5 h-4 w-4" /> Add a line
              </Button>
            </div>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No lines yet. The claim total is {formatMoney(savedTotal)}.{editable ? " Add what was given so NHIS can check it." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">NHIS price code</th>
                  <th className="py-2 pr-3 text-right font-medium">Qty</th>
                  <th className="py-2 pr-3 text-right font-medium">Each</th>
                  <th className="py-2 pr-3 text-right font-medium">Amount</th>
                  {editable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l, i) => (
                  <tr key={l.key} className="align-top">
                    <td className="py-2 pr-3">
                      {editable ? (
                        <Input aria-label={`Line ${i + 1} service`} value={l.description} onChange={(e) => patch(l.key, { description: e.target.value })} />
                      ) : (
                        <span className="text-foreground">{l.description}</span>
                      )}
                      {lineErrors[i] && editable && <p className="mt-1 text-xs text-destructive">{lineErrors[i]}</p>}
                    </td>
                    <td className="py-2 pr-3">
                      {editable ? (
                        <Input aria-label={`Line ${i + 1} NHIS price code`} value={l.tariffCode} onChange={(e) => patch(l.key, { tariffCode: e.target.value })} className="w-36 font-clinical" />
                      ) : (
                        <span className="font-clinical">{l.tariffCode || "—"}</span>
                      )}
                      {!l.tariffCode.trim() && <StatusPill tone="warning" className="mt-1">No NHIS price code</StatusPill>}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {editable ? (
                        <Input aria-label={`Line ${i + 1} quantity`} inputMode="numeric" value={l.quantity} onChange={(e) => patch(l.key, { quantity: e.target.value.replace(/\D/g, "") })} className="ml-auto w-20 text-right font-clinical" />
                      ) : (
                        <span className="font-clinical">{l.quantity}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {editable ? <MoneyInput id={`line-${l.key}-unit`} value={l.unit} onChange={(v) => patch(l.key, { unit: v })} className="ml-auto w-36" /> : <span className="font-clinical">{formatMoney(parseMoney(l.unit))}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right font-clinical">{formatMoney((Number(l.quantity) || 0) * (Number.isFinite(parseMoney(l.unit)) ? parseMoney(l.unit) : 0))}</td>
                    {editable && (
                      <td className="py-2">
                        <Button variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={4} className="py-2 pr-3 text-right font-medium">
                    Claim total
                  </td>
                  <td className="py-2 pr-3 text-right font-clinical font-semibold">{formatMoney(total)}</td>
                  {editable && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="claim-notes">Supporting note (optional)</Label>
          <Textarea id="claim-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} placeholder="e.g. Patient's NHIS renewed on 28 Sep; card copy attached to the paper claim." />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          {editable && dirty && (
            <Button variant="outline" disabled={!valid || saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          )}
          {(claim.status === "READY" || claim.status === "REJECTED") && (
            <Button variant="ghost" disabled={moveMut.isPending} onClick={() => setConfirm("DRAFT")}>
              Back to draft
            </Button>
          )}
          {claim.status === "DRAFT" && (
            <Button disabled={!valid || lines.length === 0 || moveMut.isPending} onClick={() => moveMut.mutate("READY")}>
              Mark ready to send
            </Button>
          )}
          {claim.status === "READY" && (
            <Button disabled={!valid || moveMut.isPending} onClick={() => setConfirm("SUBMITTED")}>
              Mark as sent
            </Button>
          )}
          {(claim.status === "REJECTED" || claim.status === "ACTION_REQUIRED") && (
            <Button disabled={!valid || lines.length === 0 || moveMut.isPending} onClick={() => setConfirm("SUBMITTED")}>
              Resend claim
            </Button>
          )}
          {claim.status === "SUBMITTED" && <Button onClick={() => setAnswering(true)}>Record NHIS&apos;s answer</Button>}
        </div>
        {claim.status === "DRAFT" && lines.length === 0 && <p className="text-right text-xs text-muted-foreground">Add at least one line before it can be sent.</p>}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">History</h2>
        {!admin ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatClinicalDateTime(claim.createdAt)} · last changed {formatClinicalDateTime(claim.updatedAt)}. The full history is visible to administrators.
          </p>
        ) : historyQuery.isError ? (
          <ErrorState error={historyQuery.error} onRetry={() => void historyQuery.refetch()} />
        ) : history.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Created {formatClinicalDateTime(claim.createdAt)}. No changes recorded yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span className="text-foreground">{historyText(h.action, h.details)}</span>
                <span className="text-muted-foreground">
                  {h.actorUsername} · {h.createdAt ? formatClinicalDateTime(h.createdAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "DRAFT" ? "Move this claim back to draft?" : claim.status === "READY" ? `Mark claim ${claim.claimReference} as sent?` : `Resend claim ${claim.claimReference}?`}
        description={
          confirm === "DRAFT"
            ? "It leaves the ready list until you mark it ready again."
            : `Send it through the NHIA claims portal (${formatMoney(lines.length ? total : savedTotal)}), then mark it here.`
        }
        confirmLabel={confirm === "DRAFT" ? "Back to draft" : claim.status === "READY" ? "Mark as sent" : "Resend claim"}
        cancelLabel="Not yet"
        pending={moveMut.isPending}
        onConfirm={async () => {
          if (confirm) await moveMut.mutateAsync(confirm);
        }}
      />
      {answering && <AnswerDialog claim={claim} notes={notes} onClose={() => setAnswering(false)} />}
    </div>
  );
}

function saveError(e: unknown): string {
  return getFriendlyError(e).message;
}

function historyText(action: string, details: string): string {
  const pretty = (code: string) => claimStatus(code.trim()).label.toLowerCase();
  if (/STATUS/i.test(action) && details.includes("→")) {
    const [from, to] = details.split("→");
    return `Moved from ${pretty(from)} to ${pretty(to)}`;
  }
  if (/STATUS/i.test(action) && details.includes("->")) {
    const [from, to] = details.split("->");
    return `Moved from ${pretty(from)} to ${pretty(to)}`;
  }
  if (/UPDATE/i.test(action)) return "Lines or amount changed";
  return "Changed";
}

/** FIN-07 — record what NHIS said about a sent claim. */
function AnswerDialog({ claim, notes, onClose }: { claim: FinanceNhisClaimDto; notes: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [answer, setAnswer] = useState<"PAID" | "ACTION_REQUIRED" | "REJECTED">("PAID");
  const [why, setWhy] = useState("");
  const [other, setOther] = useState("");
  const reasonText = why === "Other" ? other.trim() : why;
  const needsReason = answer !== "PAID";

  const mut = useMutation({
    mutationFn: async () => {
      const moved = await financeService.patchClaimStatus(claim.id, answer);
      // No reason field on claims yet (backend-gaps.md#FIN-07-response).
      if (needsReason) {
        try {
          return { moved, kept: await financeService.saveClaimReason(moved, reasonText, notes) };
        } catch {
          return { moved, kept: false };
        }
      }
      return { moved, kept: true };
    },
    onSuccess: ({ kept }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.finance.all });
      void qc.invalidateQueries({ queryKey: queryKeys.audit.events });
      if (answer === "PAID") toast.success("Recorded: NHIS accepted the claim.");
      else if (kept) toast.success("Recorded. The claim is in Needs action with the reason.");
      else notify.error("NHIS's answer was recorded, but the reason couldn't be kept on this claim. Write it on the paper claim.");
      onClose();
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  const choices = useMemo(
    () => [
      { value: "PAID", label: "Accepted" },
      { value: "ACTION_REQUIRED", label: "Questioned" },
      { value: "REJECTED", label: "Rejected" },
    ],
    [],
  );

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && !mut.isPending && onClose()}
      size="md"
      title="Record NHIS's answer"
      description={`Claim ${claim.claimReference} · ${formatMoney(claim.amountMinor)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button disabled={mut.isPending || (needsReason && !reasonText)} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Record answer
          </Button>
        </>
      }
    >
      <FormDialogSection columns={1}>
        <RadioGroup value={answer} onValueChange={(v) => setAnswer(v as typeof answer)} className="grid gap-2 sm:grid-cols-3" aria-label="NHIS's answer">
          {choices.map((c) => (
            <ChoiceOption key={c.value}>
              <RadioGroupItem value={c.value} /> {c.label}
            </ChoiceOption>
          ))}
        </RadioGroup>
        {needsReason && !financeService.canKeepClaimReason(claim) && (
          <InlineNotice tone="warning">The reason can&apos;t be kept on this claim yet (it already has lines). Choose it anyway for the record here, and write it on the paper claim.</InlineNotice>
        )}
        {needsReason && (
          <div className="space-y-2">
            <Label id="why-label">What NHIS said</Label>
            <RadioGroup value={why} onValueChange={setWhy} aria-labelledby="why-label" className="grid gap-2">
              {NHIS_REASONS.map((r) => (
                <ChoiceOption key={r}>
                  <RadioGroupItem value={r} /> {r}
                </ChoiceOption>
              ))}
            </RadioGroup>
            {why === "Other" && <Textarea aria-label="NHIS's reason" rows={2} value={other} onChange={(e) => setOther(e.target.value)} placeholder="Write the reason in plain words" />}
          </div>
        )}
      </FormDialogSection>
    </FormDialog>
  );
}
