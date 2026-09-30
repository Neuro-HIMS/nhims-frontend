"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatClinicalDateTime } from "@/lib/dates";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { parseReport } from "@/lib/imaging";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

/** Local calendar day (YYYY-MM-DD), the same day the date picker and "today" use. */
const dayOf = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** RAD-04 — reported scans, filterable by date and exam; open one to read or print it. */
export function ImagingReportsView() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exam, setExam] = useState("ALL");
  const [q, setQ] = useState("");

  const reportedQuery = useQuery({
    queryKey: [...queryKeys.clinical.radiologyWorklist, "COMPLETED"],
    queryFn: () => clinicalService.radiologyWorklist("COMPLETED"),
    refetchInterval: 60_000,
  });
  const all = useMemo(() => reportedQuery.data ?? [], [reportedQuery.data]);
  const exams = useMemo(() => [...new Set(all.map((o) => o.serviceName))].sort(), [all]);

  const rows = all
    .filter((o) => (exam === "ALL" ? true : o.serviceName === exam))
    .filter((o) => (!from || dayOf(o.completedAt) >= from) && (!to || dayOf(o.completedAt) <= to))
    .filter((o) => {
      const s = q.trim().toLowerCase();
      return !s || o.patientName.toLowerCase().includes(s) || o.patientPublicId.toLowerCase().includes(s);
    })
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const filtersOn = Boolean(from || to || exam !== "ALL" || q.trim());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search by patient" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Patient name or number" className="pl-9" />
        </div>
        <Select value={exam} onValueChange={setExam}>
          <SelectTrigger aria-label="Exam" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Every exam</SelectItem>
            {exams.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePickerField id="reports-from" value={from} onChange={setFrom} placeholder="From" className="w-40" />
        <DatePickerField id="reports-to" value={to} onChange={setTo} placeholder="To" className="w-40" />
        {filtersOn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setExam("ALL");
              setQ("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {reportedQuery.isPending ? (
        <TableSkeleton rows={5} columns={5} />
      ) : reportedQuery.isError ? (
        <ErrorState error={reportedQuery.error} onRetry={() => void reportedQuery.refetch()} />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration={filtersOn ? "no-results" : "empty-list"}
            title={filtersOn ? "No reports match these filters" : "No reports yet"}
            description={filtersOn ? "Try other dates or another exam." : "Reports you write will be listed here."}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium tracking-wide">Reported</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Patient</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Exam</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">Impression</th>
                <th className="px-4 py-2.5 font-medium tracking-wide">By</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 font-clinical text-xs">{o.completedAt ? formatClinicalDateTime(o.completedAt) : "—"}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{naturalName(o.patientName)}</p>
                    <p className="patient-id">{o.patientPublicId}</p>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {o.serviceName}
                    {o.studyName && o.studyName !== o.serviceName ? <span className="block text-xs text-muted-foreground">{o.studyName}</span> : null}
                  </td>
                  <td className="max-w-72 px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="line-clamp-2">{parseReport(o.reportText).impression || parseReport(o.reportText).findings}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{cleanPersonName(o.reportedByName) || "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/radiology?view=study&orderId=${o.id}`)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
