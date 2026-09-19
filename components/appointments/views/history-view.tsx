"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download } from "lucide-react";

import { DataTable, type DataTableColumn, TableToolbar } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentStatusLabel, appointmentStatusTone } from "@/lib/status-labels";
import { formatTableDateTime } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import { appointmentsService } from "@/services/appointments.service";
import type { AppointmentDto } from "@/types/appointments.types";
import { visitTypeLabel } from "@/components/appointments/appointment-utils";
import { minorToGhs } from "@/components/finance/finance-utils";

export function HistoryView() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const searchParams = {
    from: from ? `${from}T00:00:00` : undefined,
    to: to ? `${to}T23:59:59` : undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  };

  const history = useQuery({
    queryKey: queryKeys.appointments.search(searchParams),
    queryFn: () => appointmentsService.search(searchParams),
  });

  const filtered = useMemo(() => {
    const all = history.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientPublicId.toLowerCase().includes(q) ||
        a.appointmentNumber.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q),
    );
  }, [history.data, query]);

  function downloadSpreadsheet() {
    const header = ["When", "Appointment", "Patient", "Hospital number", "Service", "Doctor", "Fee (GHS)", "Status"];
    const lines = [header.join(",")];
    for (const a of filtered) {
      lines.push(
        [
          a.scheduledFor ? formatTableDateTime(a.scheduledFor) : "",
          a.appointmentNumber,
          `"${a.patientName}"`,
          a.patientPublicId,
          `"${a.serviceName}"`,
          `"${a.clinicianName || ""}"`,
          minorToGhs(a.feeMinor),
          appointmentStatusLabel(a.status),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<AppointmentDto>[] = [
    {
      key: "when",
      header: "When",
      cell: (a) => (
        <span className="font-clinical text-xs text-muted-foreground">
          {a.scheduledFor ? formatTableDateTime(a.scheduledFor) : "—"}
        </span>
      ),
    },
    { key: "appointment", header: "Appointment", cell: (a) => <span className="font-clinical text-xs">{a.appointmentNumber}</span> },
    {
      key: "patient",
      header: "Patient",
      cell: (a) => (
        <div>
          <p className="font-medium text-foreground">{a.patientName}</p>
          <p className="patient-id mt-0.5">{a.patientPublicId}</p>
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      cell: (a) => (
        <div>
          <p className="text-foreground">{a.serviceName}</p>
          <p className="text-xs text-muted-foreground">{visitTypeLabel(a.visitType)}</p>
        </div>
      ),
      hideOnTablet: true,
    },
    { key: "doctor", header: "Doctor", cell: (a) => a.clinicianName || "—", hideOnTablet: true },
    { key: "fee", header: "Fee", cell: (a) => <span className="font-clinical">GH₵ {minorToGhs(a.feeMinor)}</span>, hideOnTablet: true },
    {
      key: "status",
      header: "Status",
      cell: (a) => <StatusPill tone={appointmentStatusTone(a.status)}>{appointmentStatusLabel(a.status)}</StatusPill>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={history.isPending ? undefined : filtered}
        getRowId={(a) => a.id}
        isLoading={history.isPending}
        error={history.isError ? history.error : undefined}
        onRetry={() => void history.refetch()}
        toolbar={
          <TableToolbar
            search={{ value: query, onChange: setQuery, placeholder: "Search past appointments" }}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <DatePickerField value={from} onChange={setFrom} placeholder="From date" className="h-9 w-36" />
                <DatePickerField value={to} onChange={setTo} placeholder="To date" className="h-9 w-36" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Every status</SelectItem>
                    <SelectItem value="SCHEDULED">Booked</SelectItem>
                    <SelectItem value="CHECKED_IN">Arrived</SelectItem>
                    <SelectItem value="IN_PROGRESS">Being seen</SelectItem>
                    <SelectItem value="COMPLETED">Done</SelectItem>
                    <SelectItem value="NO_SHOW">Didn&apos;t come</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            actions={
              <Button variant="outline" size="sm" onClick={downloadSpreadsheet} disabled={filtered.length === 0}>
                <Download className="mr-1.5 h-4 w-4" /> Download as spreadsheet
              </Button>
            }
          />
        }
        empty={{
          illustration: "no-results",
          title: "No appointments match",
          description: "Try a different search, date range or status.",
        }}
      />
    </div>
  );
}
