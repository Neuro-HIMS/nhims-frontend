"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, TableToolbar, type DataTableColumn } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { getFriendlyError } from "@/lib/api-errors";
import { formatMoney } from "@/lib/billing";
import { formatClinicalDate } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { CLAIM_TABS, claimStatus, type ClaimTab } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { billingService } from "@/services/billing.service";
import { financeService } from "@/services/finance.service";
import type { FinanceNhisClaimDto } from "@/types/finance.types";

/** FIN-05 / FIN-07 — NHIS claims by stage; mark ready claims as sent in one go. */
export function NhisClaimsView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ClaimTab>("DRAFT");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmSend, setConfirmSend] = useState(false);

  const claimsQuery = useQuery({ queryKey: queryKeys.finance.claims, queryFn: () => financeService.listClaims(), refetchInterval: 60_000 });
  // Claims only carry the hospital number; names come from the bills list.
  const billsQuery = useQuery({ queryKey: queryKeys.billing.bills("ALL", ""), queryFn: () => billingService.listBills({}) });
  const nameByHn = useMemo(() => new Map((billsQuery.data ?? []).map((b) => [b.patientPublicId, b.patientName] as const)), [billsQuery.data]);

  const counts = useMemo(() => {
    const out: Record<ClaimTab, number> = { ACTION: 0, DRAFT: 0, READY: 0, SUBMITTED: 0, PAID: 0 };
    for (const c of claimsQuery.data ?? []) for (const t of CLAIM_TABS) if (t.statuses.includes(c.status)) out[t.tab] += 1;
    return out;
  }, [claimsQuery.data]);

  const rows = useMemo(() => {
    if (!claimsQuery.data) return undefined;
    const statuses = CLAIM_TABS.find((t) => t.tab === tab)!.statuses;
    const q = search.trim().toLowerCase();
    return claimsQuery.data
      .filter((c) => statuses.includes(c.status))
      .filter((c) => !q || `${c.claimReference} ${c.patientPublicId} ${nameByHn.get(c.patientPublicId) ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (b.servicePeriodStart ?? b.createdAt).localeCompare(a.servicePeriodStart ?? a.createdAt));
  }, [claimsQuery.data, tab, search, nameByHn]);

  const chosen = (rows ?? []).filter((c) => selected.has(c.id));
  const chosenTotal = chosen.reduce((s, c) => s + c.amountMinor, 0);

  const sendMut = useMutation({
    mutationFn: async () => {
      let sent = 0;
      const failed: string[] = [];
      for (const c of chosen) {
        try {
          await financeService.patchClaimStatus(c.id, "SUBMITTED");
          sent += 1;
        } catch (e) {
          failed.push(`${c.claimReference}: ${getFriendlyError(e).message}`);
        }
      }
      return { sent, failed };
    },
    onSuccess: ({ sent, failed }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.finance.all });
      setSelected(new Set());
      if (sent) toast.success(`${sent} claim${sent === 1 ? "" : "s"} marked as sent.`);
      if (failed.length) notify.error(`${failed.length} not marked: ${failed.join("; ")}`);
    },
  });

  const columns: DataTableColumn<FinanceNhisClaimDto>[] = [
    {
      key: "claim",
      header: "Claim",
      cell: (c) => (
        <div>
          <p className="font-clinical text-foreground">{c.claimReference}</p>
          <p className="text-xs text-muted-foreground">{c.lines.length ? `${c.lines.length} line${c.lines.length === 1 ? "" : "s"}` : "No lines yet"}</p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      cell: (c) => (
        <div>
          <p className="font-medium text-foreground">{nameByHn.get(c.patientPublicId) ? naturalName(nameByHn.get(c.patientPublicId)!) : "—"}</p>
          <p className="patient-id">{c.patientPublicId}</p>
        </div>
      ),
    },
    { key: "date", header: "Visit date", hideOnTablet: true, cell: (c) => <span className="text-muted-foreground">{c.servicePeriodStart ? formatClinicalDate(c.servicePeriodStart) : "—"}</span> },
    { key: "amount", header: "Amount", className: "text-right", cell: (c) => <span className="font-clinical">{formatMoney(c.amountMinor)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (c) => {
        const s = claimStatus(c.status);
        const reason = financeService.reasonFor(c);
        return (
          <div className="space-y-1">
            <StatusPill tone={s.tone}>{s.label}</StatusPill>
            {reason && <p className="max-w-[260px] text-xs text-muted-foreground">{reason}</p>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Claim stage" className="flex flex-wrap gap-2">
        {CLAIM_TABS.map((t) => (
          <button
            key={t.tab}
            role="tab"
            type="button"
            aria-selected={tab === t.tab}
            onClick={() => {
              setTab(t.tab);
              setSelected(new Set());
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              tab === t.tab ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-card text-foreground hover:bg-muted/50",
            )}
          >
            {t.label}{" "}
            <span className={cn("ml-1 rounded-full px-1.5 text-xs", tab === t.tab ? "bg-primary/10" : t.tab === "ACTION" && counts.ACTION > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
              {counts[t.tab]}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(c) => c.id}
        isLoading={claimsQuery.isPending}
        error={claimsQuery.isError ? claimsQuery.error : undefined}
        onRetry={() => void claimsQuery.refetch()}
        onRowClick={(c) => router.push(`/finance?view=claim&claimId=${c.id}`)}
        selectable={tab === "READY"}
        selectedIds={selected}
        onSelectedIdsChange={setSelected}
        toolbar={
          <TableToolbar
            search={{ value: search, onChange: setSearch, placeholder: "Claim, patient or hospital number" }}
            actions={
              tab === "READY" ? (
                <Button size="sm" disabled={chosen.length === 0 || sendMut.isPending} onClick={() => setConfirmSend(true)}>
                  <Send className="mr-1.5 h-4 w-4" /> Mark selected as sent
                </Button>
              ) : undefined
            }
          />
        }
        empty={
          search.trim()
            ? { illustration: "no-results", title: "No claims match", description: "Try another claim or hospital number.", action: { label: "Clear search", onClick: () => setSearch("") } }
            : tab === "ACTION"
              ? { illustration: "all-done", tone: "good-news", title: "Nothing needs action", description: "Claims NHIS questioned or rejected show here with the reason." }
              : tab === "DRAFT"
                ? { illustration: "empty-list", title: "No draft claims", description: "A draft is made automatically when an NHIS patient's visit is finished or they're discharged." }
                : { illustration: "empty-list", title: `No claims ${CLAIM_TABS.find((t) => t.tab === tab)!.label.toLowerCase()}`, description: "Claims move here as you work on them." }
        }
      />

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Mark ${chosen.length} claim${chosen.length === 1 ? "" : "s"} as sent (${formatMoney(chosenTotal)})?`}
        description="Send them through the NHIA claims portal as usual, then mark them here. NHIS's answer is recorded on each claim when it comes back."
        confirmLabel="Mark as sent"
        cancelLabel="Not yet"
        pending={sendMut.isPending}
        onConfirm={async () => {
          await sendMut.mutateAsync();
        }}
      />
    </div>
  );
}
