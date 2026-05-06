"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarPlus, CheckCircle2, Clock, Loader2, PlayCircle, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentsService } from "@/services/appointments.service";
import type { AppointmentDto } from "@/types/appointments.types";
import {
  STATUS_LABEL,
  statusPillClass,
  visitTypeLabel,
} from "@/components/appointments/appointment-utils";
import { minorToGhs, PAYER_LABEL, showApiError } from "@/components/finance/finance-utils";

export function QueueView() {
  const qc = useQueryClient();
  const today = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () => appointmentsService.today(),
    refetchInterval: 30_000,
  });

  const counts = useMemo(() => {
    const list = today.data ?? [];
    return {
      total: list.length,
      scheduled: list.filter((a) => a.status === "SCHEDULED").length,
      checkedIn: list.filter((a) => a.status === "CHECKED_IN").length,
      inProgress: list.filter((a) => a.status === "IN_PROGRESS").length,
      completed: list.filter((a) => a.status === "COMPLETED").length,
    };
  }, [today.data]);

  const checkIn   = useMutation({ mutationFn: (id: string) => appointmentsService.checkIn(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Checked in"); },
    onError: (e) => toast.error(showApiError(e)) });
  const start     = useMutation({ mutationFn: (id: string) => appointmentsService.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Visit started"); },
    onError: (e) => toast.error(showApiError(e)) });
  const complete  = useMutation({ mutationFn: (id: string) => appointmentsService.complete(id, { openBill: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); qc.invalidateQueries({ queryKey: ["finance"] }); toast.success("Completed — bill issued in Finance"); },
    onError: (e) => toast.error(showApiError(e)) });
  const cancel    = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => appointmentsService.cancel(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Cancelled"); },
    onError: (e) => toast.error(showApiError(e)) });
  const noShow    = useMutation({ mutationFn: (id: string) => appointmentsService.noShow(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Marked no-show"); },
    onError: (e) => toast.error(showApiError(e)) });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const list = today.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.patientPublicId.toLowerCase().includes(q) ||
        a.appointmentNumber.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q)
      );
    });
  }, [today.data, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        <Stat label="Total today"   value={counts.total} />
        <Stat label="Scheduled"     value={counts.scheduled} />
        <Stat label="Checked in"    value={counts.checkedIn} />
        <Stat label="In progress"   value={counts.inProgress} />
        <Stat label="Completed"     value={counts.completed} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d LLLL yyyy")}</p>
        <Button asChild size="sm">
          <Link href="/appointments?view=book"><CalendarPlus className="mr-1.5 h-4 w-4" /> Book appointment</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by patient, appointment no., or service..."
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

      {today.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading queue…</p>}
      {today.isError && <p className="text-sm text-destructive">Could not load today&apos;s queue.</p>}

      {today.data && today.data.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
            <p>No appointments booked for today.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/appointments?view=book">Book first appointment</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {today.data && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Time</Th>
                <Th>Patient</Th>
                <Th className="hidden md:table-cell">Service</Th>
                <Th className="hidden lg:table-cell">Clinician</Th>
                <Th className="hidden md:table-cell">Payer / fee</Th>
                <Th>Status</Th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageItems.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-clinical text-sm text-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {a.scheduledFor ? format(new Date(a.scheduledFor), "HH:mm") : "—"}
                    </span>
                    <p className="patient-id mt-0.5">{a.appointmentNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{a.patientName}</p>
                    <p className="patient-id mt-0.5">{a.patientPublicId}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    <p className="text-foreground">{a.serviceName}</p>
                    <p className="text-xs">{visitTypeLabel(a.visitType)} · {a.department}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">{a.clinicianName || "—"}</td>
                  <td className="hidden px-4 py-3 text-sm md:table-cell">
                    <p>{PAYER_LABEL[a.payerType] ?? a.payerType}</p>
                    <p className="font-clinical text-xs text-muted-foreground">GH₵ {minorToGhs(a.feeMinor)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusPillClass(a.status)}>{STATUS_LABEL[a.status] ?? a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      appt={a}
                      pending={checkIn.isPending || start.isPending || complete.isPending || cancel.isPending || noShow.isPending}
                      onCheckIn={() => checkIn.mutate(a.id)}
                      onStart={() => start.mutate(a.id)}
                      onComplete={() => complete.mutate(a.id)}
                      onCancel={() => {
                        const reason = window.prompt("Cancellation reason?") ?? "";
                        if (!reason.trim()) return;
                        cancel.mutate({ id: a.id, reason });
                      }}
                      onNoShow={() => noShow.mutate(a.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
      </CardContent>
    </Card>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>;
}

function RowActions({
  appt, pending, onCheckIn, onStart, onComplete, onCancel, onNoShow,
}: {
  appt: AppointmentDto;
  pending: boolean;
  onCheckIn: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {appt.status === "SCHEDULED" && (
        <>
          <Button variant="outline" size="sm" disabled={pending} onClick={onCheckIn}>
            <UserCheck className="mr-1 h-3.5 w-3.5" /> Check in
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
            <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
          </Button>
        </>
      )}
      {appt.status === "CHECKED_IN" && (
        <>
          <Button variant="outline" size="sm" disabled={pending} onClick={onStart}>
            <PlayCircle className="mr-1 h-3.5 w-3.5" /> Start
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={onNoShow}>
            No show
          </Button>
        </>
      )}
      {appt.status === "IN_PROGRESS" && (
        <Button variant="default" size="sm" disabled={pending} onClick={onComplete}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete &amp; bill
        </Button>
      )}
    </div>
  );
}
