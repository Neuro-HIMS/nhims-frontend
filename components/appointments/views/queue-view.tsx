"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarPlus, Clock, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type DataTableColumn, TableToolbar } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { appointmentStatusLabel, appointmentStatusTone } from "@/lib/status-labels";
import { queryKeys } from "@/lib/query-keys";
import { appointmentsService } from "@/services/appointments.service";
import type { AppointmentDto } from "@/types/appointments.types";
import { visitTypeLabel } from "@/components/appointments/appointment-utils";
import { PAYER_LABEL, minorToGhs } from "@/components/finance/finance-utils";

const STAT_DEFS: Array<{ key: string; status: string }> = [
  { key: "booked", status: "SCHEDULED" },
  { key: "arrived", status: "CHECKED_IN" },
  { key: "seen", status: "IN_PROGRESS" },
  { key: "done", status: "COMPLETED" },
  { key: "noShow", status: "NO_SHOW" },
];

export function QueueView() {
  const qc = useQueryClient();
  const today = useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: () => appointmentsService.today(),
    refetchInterval: 30_000,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [rescheduleFor, setRescheduleFor] = useState<AppointmentDto | null>(null);
  const [noShowFor, setNoShowFor] = useState<AppointmentDto | null>(null);
  const [cancelFor, setCancelFor] = useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  function invalidateAfterChange() {
    qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    qc.invalidateQueries({ queryKey: queryKeys.clinical.today });
    qc.invalidateQueries({ queryKey: queryKeys.opd.queue });
  }

  const checkIn = useMutation({
    mutationFn: (id: string) => appointmentsService.checkIn(id),
    onSuccess: () => {
      invalidateAfterChange();
      toast.success("Checked in — waiting for the nurse");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const start = useMutation({
    mutationFn: (id: string) => appointmentsService.start(id),
    onSuccess: () => {
      invalidateAfterChange();
      toast.success("Visit started");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const complete = useMutation({
    mutationFn: (id: string) => appointmentsService.complete(id, { openBill: true }),
    onSuccess: () => {
      invalidateAfterChange();
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Completed — a bill is waiting in Finance");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => appointmentsService.cancel(id, reason),
    onSuccess: () => {
      invalidateAfterChange();
      toast.success("Appointment cancelled");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const noShow = useMutation({
    mutationFn: (id: string) => appointmentsService.noShow(id),
    onSuccess: () => {
      invalidateAfterChange();
      toast.success("Marked as didn't come");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const anyPending = checkIn.isPending || start.isPending || complete.isPending || cancel.isPending || noShow.isPending;

  const stats = useMemo(() => {
    const list = today.data ?? [];
    return STAT_DEFS.map((s) => ({
      ...s,
      label: appointmentStatusLabel(s.status),
      count: list.filter((a) => a.status === s.status).length,
    }));
  }, [today.data]);

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

  const columns: DataTableColumn<AppointmentDto>[] = [
    {
      key: "time",
      header: "Time",
      cell: (a) => (
        <span className="flex items-center gap-1.5 font-clinical text-sm text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {a.scheduledFor ? format(new Date(a.scheduledFor), "HH:mm") : "—"}
        </span>
      ),
    },
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
      key: "clinic",
      header: "Where",
      cell: (a) => (
        <div>
          <p className="text-foreground">{a.serviceName}</p>
          <p className="text-xs text-muted-foreground">{visitTypeLabel(a.visitType)}</p>
        </div>
      ),
      hideOnTablet: true,
    },
    { key: "doctor", header: "Doctor", cell: (a) => a.clinicianName || "Any available doctor", hideOnTablet: true },
    {
      key: "payer",
      header: "Payer / fee",
      cell: (a) => (
        <div>
          <p>{PAYER_LABEL[a.payerType] ?? a.payerType}</p>
          <p className="font-clinical text-xs text-muted-foreground">GH₵ {minorToGhs(a.feeMinor)}</p>
        </div>
      ),
      hideOnTablet: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => <StatusPill tone={appointmentStatusTone(a.status)}>{appointmentStatusLabel(a.status)}</StatusPill>,
    },
    {
      key: "checkin",
      header: "",
      cell: (a) =>
        a.status === "SCHEDULED" ? (
          <Button size="sm" disabled={anyPending} onClick={() => checkIn.mutate(a.id)}>
            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Check in
          </Button>
        ) : a.status === "CHECKED_IN" ? (
          <Button size="sm" variant="outline" disabled={anyPending} onClick={() => start.mutate(a.id)}>
            Start visit
          </Button>
        ) : a.status === "IN_PROGRESS" ? (
          <Button size="sm" variant="outline" disabled={anyPending} onClick={() => complete.mutate(a.id)}>
            Complete &amp; bill
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="stat-card-label">{s.label}</p>
            <p className="stat-card-value">{s.count}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={today.isPending ? undefined : filtered}
        getRowId={(a) => a.id}
        isLoading={today.isPending}
        error={today.isError ? today.error : undefined}
        onRetry={() => void today.refetch()}
        rowActions={(a) => (
          <>
            {(a.status === "SCHEDULED" || a.status === "CHECKED_IN") && (
              <DropdownMenuItem onSelect={() => setRescheduleFor(a)}>Reschedule</DropdownMenuItem>
            )}
            {a.status === "SCHEDULED" && slotTimeHasPassed(a) && (
              <DropdownMenuItem onSelect={() => setNoShowFor(a)}>Mark as didn&apos;t come</DropdownMenuItem>
            )}
            {(a.status === "SCHEDULED" || a.status === "CHECKED_IN") && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setCancelReason("");
                  setCancelFor(a);
                }}
              >
                Cancel
              </DropdownMenuItem>
            )}
          </>
        )}
        toolbar={
          <TableToolbar
            search={{ value: search, onChange: setSearch, placeholder: "Search today's appointments" }}
            filters={
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
            }
            actions={
              <Button asChild size="sm">
                <Link href="/appointments?view=book">
                  <CalendarPlus className="mr-1.5 h-4 w-4" /> Book appointment
                </Link>
              </Button>
            }
          />
        }
        empty={{
          illustration: "empty-list",
          title: "No appointments today",
          description: "Booked appointments for today will appear here.",
          action: { label: "Book appointment", href: "/appointments?view=book" },
        }}
      />

      <RescheduleDialog appointment={rescheduleFor} onClose={() => setRescheduleFor(null)} onDone={invalidateAfterChange} />

      <ConfirmDialog
        open={Boolean(noShowFor)}
        onOpenChange={(open) => !open && setNoShowFor(null)}
        title={`Mark ${noShowFor?.patientName ?? ""} as didn't come?`}
        description="Records that the patient did not arrive for this appointment."
        confirmLabel="Mark as didn't come"
        destructive
        pending={noShow.isPending}
        onConfirm={async () => {
          if (!noShowFor) return;
          await noShow.mutateAsync(noShowFor.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelFor)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelFor(null);
            setCancelReason("");
          }
        }}
        title={`Cancel ${cancelFor?.patientName ?? ""}'s appointment?`}
        description="This frees the slot. The reason is kept with the appointment."
        cancelLabel="Keep appointment"
        confirmLabel="Yes, cancel appointment"
        destructive
        pending={cancel.isPending}
        footerExtra={
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancelling"
            rows={3}
            className="resize-none text-sm"
          />
        }
        onConfirm={async () => {
          if (!cancelFor) return;
          const reason = cancelReason.trim();
          if (!reason) {
            toast.error("Enter a reason for cancelling");
            throw new Error("reason");
          }
          await cancel.mutateAsync({ id: cancelFor.id, reason });
          setCancelReason("");
        }}
      />
    </div>
  );
}

function slotTimeHasPassed(a: AppointmentDto): boolean {
  if (!a.scheduledFor) return true;
  return new Date(a.scheduledFor).getTime() < Date.now();
}

function RescheduleDialog({
  appointment,
  onClose,
  onDone,
}: {
  appointment: AppointmentDto | null;
  onClose: () => void;
  onDone: () => void;
}) {
  return appointment ? (
    <RescheduleDialogInner key={appointment.id} appointment={appointment} onClose={onClose} onDone={onDone} />
  ) : null;
}

function RescheduleDialogInner({
  appointment,
  onClose,
  onDone,
}: {
  appointment: AppointmentDto;
  onClose: () => void;
  onDone: () => void;
}) {
  const initial = appointment.scheduledFor ? new Date(appointment.scheduledFor) : new Date();
  const [date, setDate] = useState(format(initial, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(initial, "HH:mm"));

  const reschedule = useMutation({
    mutationFn: () => appointmentsService.reschedule(appointment.id, { scheduledFor: `${date}T${time}:00` }),
    onSuccess: () => {
      onDone();
      toast.success("Appointment rescheduled");
      onClose();
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Reschedule ${appointment.patientName}'s appointment`}
      description="Choose a new date and time for this appointment."
      confirmLabel="Save new time"
      pending={reschedule.isPending}
      onConfirm={() => reschedule.mutate()}
      footerExtra={
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DatePickerField value={date} onChange={setDate} />
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-clinical" />
          </div>
        </div>
      }
    />
  );
}
