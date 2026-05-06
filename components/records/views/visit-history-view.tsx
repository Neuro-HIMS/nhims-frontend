"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { appointmentsService } from "@/services/appointments.service";

export function VisitHistoryView() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const visits = useQuery({
    queryKey: ["records", "visit-history"],
    queryFn: () => appointmentsService.search({}),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = visits.data ?? [];
    if (!q) return list;
    return list.filter(
      (v) =>
        v.patientName.toLowerCase().includes(q) ||
        v.patientPublicId.toLowerCase().includes(q) ||
        v.appointmentNumber.toLowerCase().includes(q) ||
        v.serviceName.toLowerCase().includes(q),
    );
  }, [visits.data, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search by patient, appointment number, or service..."
        className="max-w-md"
      />

      {visits.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading visit history...
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">When</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Appointment</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Service</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {v.scheduledFor ? format(new Date(v.scheduledFor), "yyyy-MM-dd HH:mm") : "—"}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{v.patientName}</p>
                  <p className="patient-id mt-0.5">{v.patientPublicId}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{v.appointmentNumber}</td>
                <td className="px-4 py-3">{v.serviceName}</td>
                <td className="px-4 py-3">{v.status}</td>
              </tr>
            ))}
            {pageItems.length === 0 && !visits.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No visit history found.
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
