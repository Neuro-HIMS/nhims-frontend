"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { addMinutes, format } from "date-fns";
import { CalendarPlus, CheckCircle2, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MiniPatientCard } from "@/components/booking/mini-patient-card";
import {
  PRIORITIES,
  VISIT_TYPES,
  type BookingResult,
} from "@/components/booking/lib/booking-types";
import {
  lookupTariff,
  prettyRole,
  visitTypeToGroups,
} from "@/components/booking/lib/booking-utils";
import type { Patient } from "@/components/records/lib/records-types";
import { appointmentsService } from "@/services/appointments.service";
import { financeService } from "@/services/finance.service";
import { patientsService } from "@/services/patients.service";
import type {
  AppointmentDto,
  CreateAppointmentPayload,
  VisitType,
} from "@/types/appointments.types";
import type { ServiceCatalogDto } from "@/types/finance.types";
import { minorToGhs, PAYER_LABEL } from "@/components/finance/finance-utils";
import type { ApiError } from "@/types/api.types";

/**
 * The booking form proper. The mini patient card is rendered at the
 * top-left so the operator can confirm identity while filling in the
 * appointment metadata. The legacy form layout is preserved — only the
 * patient header has been compacted to fit modal usage.
 */
export function BookingForm({
  patient,
  patientId,
  onBooked,
  showPatientHeader = true,
  initialVisitType = "OPD",
}: {
  patient: Patient;
  /** Real backend UUID for the patient — bookings need this, not the public ID. */
  patientId: string;
  onBooked?: (appt: AppointmentDto) => void;
  /** Hide the embedded mini patient card when the parent already shows it. */
  showPatientHeader?: boolean;
  /** Pre-select visit type (e.g. follow-up planner). */
  initialVisitType?: VisitType;
}) {
  const qc = useQueryClient();
  const router = useRouter();

  const services = useQuery({
    queryKey: ["finance", "catalog", "services", "active"],
    queryFn: () => financeService.listServices(true),
  });
  const pricing = useQuery({
    queryKey: ["finance", "pricing", "matrix"],
    queryFn: () => financeService.listPricingMatrix(),
  });
  const payers = useQuery({
    queryKey: ["finance", "catalog", "payers"],
    queryFn: () => financeService.payerTypes(),
  });
  const clinicians = useQuery({
    queryKey: ["appointments", "clinicians"],
    queryFn: () => appointmentsService.clinicians(),
  });
  const patientVisits = useQuery({
    queryKey: ["appointments", "by-patient", patientId],
    queryFn: () => appointmentsService.byPatient(patientId),
    enabled: Boolean(patientId),
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const inAnHour = format(addMinutes(new Date(), 60), "HH:mm");

  const [date, setDate] = useState<string>(today);
  const [time, setTime] = useState<string>(inAnHour);
  const [visitType, setVisitType] = useState<VisitType>(initialVisitType);
  const [serviceId, setServiceId] = useState<string>("");
  const [payerType, setPayerType] = useState<string>(patient.nhisStatus === "active" ? "NHIS" : "CASH");
  const [clientStatus, setClientStatus] = useState<"new" | "old">("new");
  const [nhisActive, setNhisActive] = useState<boolean>(patient.nhisStatus === "active");
  const [nhisMemberNumber, setNhisMemberNumber] = useState<string>(patient.nhisCard || "");
  const [nhisExpiryDate, setNhisExpiryDate] = useState<string>("");
  const [clinicianId, setClinicianId] = useState<string>("");
  const [duration, setDuration] = useState<string>("15");
  const [priority, setPriority] = useState<string>("ROUTINE");
  const [reason, setReason] = useState<string>("");
  const [referral, setReferral] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [feeOverride, setFeeOverride] = useState<string>("");
  const [booked, setBooked] = useState<BookingResult | null>(null);
  const [nhisGateBusy, setNhisGateBusy] = useState(false);

  const filteredServices = useMemo(() => {
    const all = services.data ?? [];
    const groups = visitTypeToGroups(visitType);
    if (groups.length === 0) return all;
    return all.filter((s) => groups.includes(s.serviceGroup));
  }, [services.data, visitType]);

  const selectedService = useMemo<ServiceCatalogDto | undefined>(
    () => (services.data ?? []).find((s) => s.id === serviceId),
    [services.data, serviceId],
  );

  const tariff = useMemo(
    () => lookupTariff(pricing.data ?? [], serviceId, payerType),
    [pricing.data, serviceId, payerType],
  );
  const effectiveFee = feeOverride.trim()
    ? Math.round(Number.parseFloat(feeOverride) * 100)
    : tariff?.unitPriceMinor ?? 0;

  const bookMut = useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => appointmentsService.book(payload),
    onSuccess: (appt) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`Appointment ${appt.appointmentNumber} booked`, {
        description: `${appt.patientName} · ${appt.serviceName} · ${
          appt.scheduledFor ? format(new Date(appt.scheduledFor), "PPp") : ""
        }`,
      });
      setBooked({
        appointment: appt,
        patientName: appt.patientName,
        serviceName: appt.serviceName,
      });
      onBooked?.(appt);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Booking failed");
    },
  });

  function combinedScheduledFor(): string {
    const safeTime = time && time.length >= 5 ? time : "08:00";
    return `${date}T${safeTime}:00`;
  }

  async function submit() {
    if (!serviceId) {
      toast.error("Pick a service from the catalog");
      return;
    }
    if (!reason.trim()) {
      toast.error("Visit reason is required");
      return;
    }
    if (payerType === "NHIS") {
      const mem = nhisMemberNumber.trim();
      if (!mem) {
        toast.error("NHIS member number is required when payer is NHIS");
        return;
      }
      setNhisGateBusy(true);
      try {
        const result = await patientsService.verifyNhis(mem);
        if (result.status === "INVALID_FORMAT") {
          toast.error(result.message ?? "Invalid NHIS member number format");
          return;
        }
        if (result.status === "NOT_FOUND") {
          toast.error(result.message ?? "NHIS membership not found — cannot confirm NHIS booking");
          return;
        }
        if (result.status === "PENDING_GATEWAY") {
          toast.error(
            result.message ?? "NHIS verification is unavailable. Confirm eligibility before booking as NHIS.",
          );
          return;
        }
      } catch (e: unknown) {
        const ax = e as { response?: { data?: ApiError } };
        toast.error(ax.response?.data?.message ?? "NHIS verification failed");
        return;
      } finally {
        setNhisGateBusy(false);
      }
    }
    const clinician = (clinicians.data ?? []).find((c) => c.userId === clinicianId);
    bookMut.mutate({
      patientId,
      serviceId,
      clientStatus,
      nhisActive,
      nhisMemberNumber: nhisMemberNumber.trim(),
      nhisExpiryDate: nhisExpiryDate.trim() || undefined,
      visitType,
      payerType,
      feeMinorOverride: feeOverride.trim() ? effectiveFee : null,
      clinicianUserId: clinicianId || null,
      clinicianName: clinician?.fullName ?? "",
      scheduledFor: combinedScheduledFor(),
      durationMinutes: Number.parseInt(duration, 10) || 15,
      priority,
      reason: reason.trim(),
      referralSource: referral.trim(),
      notes: notes.trim(),
    });
  }

  useEffect(() => {
    setPayerType(patient.nhisStatus === "active" ? "NHIS" : "CASH");
    setNhisActive(patient.nhisStatus === "active");
    setNhisMemberNumber(patient.nhisCard || "");
  }, [patient.patientId, patient.nhisStatus, patient.nhisCard]);

  useEffect(() => {
    const y = Number.parseInt(date.slice(0, 4), 10);
    if (Number.isNaN(y)) {
      setClientStatus("new");
      return;
    }
    const hasYearVisit = (patientVisits.data ?? []).some((a) => {
      if (!a.scheduledFor) return false;
      return new Date(a.scheduledFor).getFullYear() === y;
    });
    setClientStatus(hasYearVisit ? "old" : "new");
  }, [date, patientVisits.data]);

  if (booked) {
    return (
      <BookedConfirmation
        booking={booked}
        onAnother={() => setBooked(null)}
        onGoToQueue={() => router.push("/appointments?view=queue")}
      />
    );
  }

  const filteredCliniciansList = clinicians.data ?? [];

  return (
    <div className="space-y-4">
      {showPatientHeader && (
        <div className="flex">
          <div className="w-full max-w-sm">
            <MiniPatientCard patient={patient} />
          </div>
        </div>
      )}

      <div className="booking-section">
        <div className="booking-section-header flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-muted-foreground" />
          <h3 className="booking-section-title">When &amp; how</h3>
        </div>
        <div className="booking-section-body">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Date *">
              <DatePickerField
                value={date}
                onChange={setDate}
                placeholder="Select date"
                fromYear={new Date().getFullYear() - 1}
                toYear={new Date().getFullYear() + 2}
              />
            </Field>
            <Field label="Time *">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="font-clinical"
              />
            </Field>
            <Field label="Duration (mins)">
              <Input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="font-clinical"
              />
            </Field>
            <Field label="Priority">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="booking-section">
        <div className="booking-section-header flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <h3 className="booking-section-title">Service &amp; clinician</h3>
        </div>
        <div className="booking-section-body">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Visit Type *">
              <Select
                value={visitType}
                onValueChange={(v) => {
                  setVisitType(v as VisitType);
                  setServiceId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Service (from catalog) *">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a service…" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {filteredServices.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No services in this group. Switch the visit type or add the service in
                      Finance → Service Catalog.
                    </div>
                  )}
                  {filteredServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.serviceName}{" "}
                      <span className="text-xs text-muted-foreground">· {s.serviceGroup}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Payer">
              <Select value={payerType} onValueChange={setPayerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(payers.data ?? []).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PAYER_LABEL[p] ?? p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fee (auto from pricing matrix)">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-clinical">
                  {tariff
                    ? `GH₵ ${minorToGhs(tariff.unitPriceMinor)}`
                    : selectedService
                    ? "No tariff for this payer — falling back to CASH or 0"
                    : "Pick a service to see the tariff"}
                </div>
                <Input
                  placeholder="Override (GH₵)"
                  value={feeOverride}
                  onChange={(e) => setFeeOverride(e.target.value)}
                  className="w-[140px] font-clinical"
                />
              </div>
              {selectedService && (
                <p className="mt-1 text-xs text-muted-foreground">
                  This fee will flow into a Finance bill when the appointment is completed.
                </p>
              )}
            </Field>

            <Field label="Assigned clinician" className="md:col-span-2">
              <Select
                value={clinicianId || "__unassigned"}
                onValueChange={(v) => setClinicianId(v === "__unassigned" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="__unassigned">— Unassigned —</SelectItem>
                  {filteredCliniciansList.map((c) => (
                    <SelectItem key={c.userId} value={c.userId}>
                      {c.fullName}{" "}
                      <span className="text-xs text-muted-foreground">· {prettyRole(c.role)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="booking-section">
        <div className="booking-section-header">
          <h3 className="booking-section-title">Client status &amp; NHIS validation</h3>
        </div>
        <div className="booking-section-body">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client status (calendar year rule)">
              <Select
                value={clientStatus}
                onValueChange={(v) => setClientStatus(v as "new" | "old")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="old">Old</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Automatically derived: first visit in selected year is new; later visits are old.
              </p>
            </Field>
            <Field label="NHIS active">
              <Select
                value={nhisActive ? "yes" : "no"}
                onValueChange={(v) => setNhisActive(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="NHIS member number">
              <Input
                value={nhisMemberNumber}
                onChange={(e) => setNhisMemberNumber(e.target.value)}
                placeholder="NHIS member number"
                className="font-clinical"
              />
            </Field>
            <Field label="NHIS expiry date">
              <DatePickerField
                value={nhisExpiryDate}
                onChange={setNhisExpiryDate}
                placeholder="Select NHIS expiry"
                fromYear={new Date().getFullYear() - 5}
                toYear={new Date().getFullYear() + 10}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="booking-section">
        <div className="booking-section-header">
          <h3 className="booking-section-title">Visit details</h3>
        </div>
        <div className="booking-section-body">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Visit reason *" className="md:col-span-2">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief clinical complaint or reason for the visit"
              />
            </Field>
            <Field label="Referral source">
              <Input
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Notes">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {selectedService ? (
            <>
              Booking{" "}
              <span className="font-medium text-foreground">{selectedService.serviceName}</span>{" "}
              for{" "}
              <span className="font-medium text-foreground">
                {patient.firstName} {patient.lastName}
              </span>{" "}
              at <span className="font-clinical">GH₵ {minorToGhs(effectiveFee)}</span>
            </>
          ) : (
            <>Pick a service to enable booking.</>
          )}
        </p>
        <Button
          onClick={submit}
          disabled={bookMut.isPending || nhisGateBusy || !serviceId || !reason.trim()}
        >
          {bookMut.isPending || nhisGateBusy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="mr-1.5 h-4 w-4" />
          )}
          Book appointment
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function BookedConfirmation({
  booking,
  onAnother,
  onGoToQueue,
}: {
  booking: BookingResult;
  onAnother: () => void;
  onGoToQueue: () => void;
}) {
  const a = booking.appointment;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--nhis-active))]/30 bg-[hsl(var(--nhis-active-bg))] p-4 text-[hsl(var(--nhis-active))]">
        <CheckCircle2 className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-medium">Appointment booked successfully</p>
          <p className="mt-0.5 text-sm">
            {a.appointmentNumber} · {booking.serviceName} ·{" "}
            {a.scheduledFor ? format(new Date(a.scheduledFor), "PPpp") : ""}
          </p>
          <p className="mt-1 text-sm">
            Fee: GH₵ {minorToGhs(a.feeMinor)} · {PAYER_LABEL[a.payerType] ?? a.payerType}. A bill
            will open in Finance when the appointment is marked completed.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onGoToQueue}>Go to today&apos;s queue</Button>
        <Button variant="outline" onClick={onAnother}>
          Book another
        </Button>
      </div>
    </div>
  );
}
