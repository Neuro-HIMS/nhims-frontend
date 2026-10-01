"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BillsTable } from "@/components/billing/bills-table";
import { TakePaymentDialog } from "@/components/billing/take-payment-dialog";
import { TableToolbar } from "@/components/common/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { daysAgoLocal, localDay, todayLocal } from "@/lib/billing";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import { patientsService } from "@/services/patients.service";
import type { BillDto } from "@/types/finance.types";
import type { PatientSearchParams } from "@/types/patients.types";

type StatusFilter = "WAITING" | "PARTIAL" | "PAID" | "CANCELLED" | "ALL";
type PayerFilter = "ALL" | "CASH" | "NHIS" | "OTHER";
type DateFilter = "ALL" | "TODAY" | "7D" | "30D";

/**
 * Bills for a search: the backend's list stops at the latest 100 (backend-gaps.md#BIL-02-cap), so a
 * search also finds matching patients and loads all of their bills.
 */
async function searchBills(q: string): Promise<BillDto[]> {
  const term = q.trim();
  const parts = term.split(/\s+/).filter(Boolean);
  const params: PatientSearchParams = /^[a-z]{2,5}-\d/i.test(term)
    ? { mode: "id", q: term }
    : /^\d{8,}$/.test(term)
      ? { mode: "nhis", q: term }
      : { mode: "name", firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
  const [recent, patients] = await Promise.all([billingService.listBills({ search: term }), patientsService.search(params).catch(() => [])]);
  const perPatient = await Promise.all(
    patients.slice(0, 5).map((p) =>
      billingService
        .billsForPatient(p.id, { size: 100 })
        .then((r) => r.content)
        .catch(() => [] as BillDto[]),
    ),
  );
  const byId = new Map<string, BillDto>();
  for (const b of [...recent, ...perPatient.flat()]) byId.set(b.id, b);
  return [...byId.values()];
}

/** BIL-02 — every bill, newest first, with search and filters. */
export function BillsView() {
  const [status, setStatus] = useState<StatusFilter>("WAITING");
  const [payer, setPayer] = useState<PayerFilter>("ALL");
  const [date, setDate] = useState<DateFilter>("ALL");
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<BillDto | null>(null);

  const q = search.trim();
  const deep = q.length >= 2;
  // Status is filtered here: the backend's status filter fails (backend-gaps.md#BIL-02-status-filter).
  const billsQuery = useQuery({
    queryKey: queryKeys.billing.bills("ALL", deep ? q : ""),
    queryFn: () => (deep ? searchBills(q) : billingService.listBills({})),
    refetchInterval: 30_000,
  });

  const rows = useMemo(() => {
    if (!billsQuery.data) return undefined;
    const since = date === "ALL" ? null : date === "TODAY" ? todayLocal() : daysAgoLocal(date === "7D" ? 6 : 29);
    return billsQuery.data
      .filter((b) => {
        // "Waiting for payment" covers open, invoiced and part-paid bills with money owed.
        if (status === "WAITING" && !(["OPEN", "INVOICED", "PARTIAL"].includes(b.status) && b.balanceMinor > 0)) return false;
        if ((status === "PARTIAL" || status === "PAID" || status === "CANCELLED") && b.status !== status) return false;
        const p = (b.primaryPayer ?? "").toUpperCase();
        if (payer === "CASH" && p !== "CASH" && p !== "IGF") return false;
        if (payer === "NHIS" && p !== "NHIS") return false;
        if (payer === "OTHER" && ["CASH", "IGF", "NHIS"].includes(p)) return false;
        const day = localDay(b.issuedAt);
        if (since && (!day || day < since)) return false;
        return true;
      })
      .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""));
  }, [billsQuery.data, status, payer, date]);

  const filtered = q !== "" || status !== "ALL" || payer !== "ALL" || date !== "ALL";
  const resetAll = () => {
    setSearch("");
    setStatus("ALL");
    setPayer("ALL");
    setDate("ALL");
  };

  return (
    <div className="space-y-3">
      <BillsTable
        rows={rows}
        isLoading={billsQuery.isPending}
        error={billsQuery.error}
        onRetry={() => void billsQuery.refetch()}
        onTakePayment={setPaying}
        toolbar={
          <TableToolbar
            search={{ value: search, onChange: setSearch, placeholder: "Patient, hospital number or bill number" }}
            filters={
              <>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <SelectTrigger className="h-9 w-48" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAITING">Waiting for payment</SelectItem>
                    <SelectItem value="PARTIAL">Part paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="ALL">All bills</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={payer} onValueChange={(v) => setPayer(v as PayerFilter)}>
                  <SelectTrigger className="h-9 w-40" aria-label="How they pay">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any payer</SelectItem>
                    <SelectItem value="CASH">Self-pay</SelectItem>
                    <SelectItem value="NHIS">NHIS</SelectItem>
                    <SelectItem value="OTHER">Insurance or company</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={date} onValueChange={(v) => setDate(v as DateFilter)}>
                  <SelectTrigger className="h-9 w-36" aria-label="Date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any date</SelectItem>
                    <SelectItem value="TODAY">Today</SelectItem>
                    <SelectItem value="7D">Last 7 days</SelectItem>
                    <SelectItem value="30D">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        }
        empty={
          status === "WAITING" && !q && payer === "ALL" && date === "ALL"
            ? {
                illustration: "all-done",
                tone: "good-news",
                title: "No one is waiting to pay",
                description: "Bills with money owed show here. Choose All bills to see paid and cancelled ones.",
              }
            : filtered
              ? { illustration: "no-results", title: "No bills match", description: "Try another name or number, or change the filters.", action: { label: "Show all bills", onClick: resetAll } }
              : {
                  illustration: "empty-list",
                  title: "No bills yet",
                  description: "Bills are created automatically when doctors order services, or you can create one.",
                  action: { label: "New bill", href: "/billing?view=new" },
                }
        }
      />
      <p className="text-xs text-muted-foreground">
        {deep ? "Includes every bill for the patients that match." : "Shows the latest 100 bills. Search for a patient to see all of their bills."} Refreshes every 30
        seconds.
      </p>
      <TakePaymentDialog bill={paying} onOpenChange={(o) => !o && setPaying(null)} />
    </div>
  );
}
