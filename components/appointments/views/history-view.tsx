"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentsService } from "@/services/appointments.service";
import { STATUS_LABEL, statusPillClass, visitTypeLabel } from "@/components/appointments/appointment-utils";
import { minorToGhs } from "@/components/finance/finance-utils";

export function HistoryView() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const recent = useQuery({
    queryKey: ["appointments", "history"],
    queryFn: () => appointmentsService.search({}),
  });

  const filtered = useMemo(() => {
    const all = recent.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.patientPublicId.toLowerCase().includes(q) ||
        a.appointmentNumber.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q)
      );
    });
  }, [recent.data, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search by patient, appointment number, or service…"
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="CHECKED_IN">Checked in</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="NO_SHOW">No show</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recent.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>When</Th>
              <Th>Appointment</Th>
              <Th>Patient</Th>
              <Th className="hidden md:table-cell">Service</Th>
              <Th className="hidden lg:table-cell">Clinician</Th>
              <Th className="hidden md:table-cell">Fee</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                  {a.scheduledFor ? format(new Date(a.scheduledFor), "yyyy-MM-dd HH:mm") : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.appointmentNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{a.patientName}</p>
                  <p className="patient-id mt-0.5">{a.patientPublicId}</p>
                </td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                  <p className="text-foreground">{a.serviceName}</p>
                  <p className="text-xs">{visitTypeLabel(a.visitType)}</p>
                </td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">{a.clinicianName || "—"}</td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                  GH₵ {minorToGhs(a.feeMinor)}
                </td>
                <td className="px-4 py-3">
                  <span className={statusPillClass(a.status)}>{STATUS_LABEL[a.status] ?? a.status}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !recent.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No appointments match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>;
}
