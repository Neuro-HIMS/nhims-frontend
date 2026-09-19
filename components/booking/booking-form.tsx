"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { addMinutes, format } from "date-fns";
import { CalendarPlus, Loader2, Stethoscope } from "lucide-react";
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
import { SuccessPanel } from "@/components/common/success-panel";
import { MiniPatientCard } from "@/components/booking/mini-patient-card";
import { NhisCheck } from "@/components/records/nhis-check";
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
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { appointmentsService } from "@/services/appointments.service";
import { financeService } from "@/services/finance.service";
import type {
  AppointmentDto,
  CreateAppointmentPayload,
  VisitType,
} from "@/types/appointments.types";
import type { ServiceCatalogDto } from "@/types/finance.types";
import { minorToGhs, PAYER_LABEL, SERVICE_GROUP_LABEL } from "@/components/finance/finance-utils";

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
    queryKey: queryKeys.appointments.clinicians,
    queryFn: () => appointmentsService.clinicians(),
  });
  const patientVisits = useQuery({
    queryKey: queryKeys.appointments.byPatient(patientId),
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
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast.success(`Appointment ${appt.appointmentNumber} booked`, {
        description: `${appt.patientName} · ${appt.serviceName} · ${
          appt.scheduledFor ? format(new Date(appt.scheduledFor), "dd/MM/yyyy HH:mm") : ""
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
      const friendly = getFriendlyError(e);
      toast.error(friendly.title, { description: friendly.message });
    },
  });

  function combinedScheduledFor(): string {
    const safeTime = time && time.length >= 5 ? time : "08:00";
    return `${date}T${safeTime}:00`;
  }

  function submit() {
    if (!serviceId) {
      toast.error("Pick a service to book");
      return;
    }
    if (!reason.trim()) {
      toast.error("Enter a reason for the visit");
      return;
    }
    if (payerType === "NHIS" && !nhisMemberNumber.trim()) {
      toast.error("Enter the patient's NHIS number, or change how they'll pay");
      return;
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
            <Field label="Date">
              <DatePickerField
                value={date}
                onChange={setDate}
                placeholder="Select date"
                fromYear={new Date().getFullYear() - 1}
                toYear={new Date().getFullYear() + 2}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="font-clinical"
              />
            </Field>
            <Field label="Duration (minutes)">
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
            <Field label="Visit type">
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
            <Field label="Service">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a service…" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {filteredServices.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No services for this visit type yet. Switch the visit type, or add the service under
                      Finance.
                    </div>
                  )}
                  {filteredServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.serviceName}{" "}
                      <span className="text-xs text-muted-foreground">· {SERVICE_GROUP_LABEL[s.serviceGroup] ?? s.serviceGroup}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="How they'll pay">
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

            <Field label="Fee">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-clinical">
                  {tariff
                    ? `GH₵ ${minorToGhs(tariff.unitPriceMinor)}`
                    : selectedService
                    ? "No price set for this payer — using self-pay or GH₵ 0"
                    : "Pick a service to see the price"}
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
                  This fee becomes a Finance bill once the appointment is completed.
                </p>
              )}
            </Field>

            <Field label="Doctor (optional)" className="md:col-span-2">
              <Select
                value={clinicianId || "__unassigned"}
                onValueChange={(v) => setClinicianId(v === "__unassigned" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="__unassigned">Any available doctor</SelectItem>
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
          <h3 className="booking-section-title">Client status</h3>
        </div>
        <div className="booking-section-body">
          <Field label="Client status" className="max-w-xs">
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
              Set automatically: their first visit in the selected year is new, later visits are old.
            </p>
          </Field>
        </div>
      </div>

      {payerType === "NHIS" && (
        <div className="booking-section">
          <div className="booking-section-header">
            <h3 className="booking-section-title">NHIS</h3>
          </div>
          <div className="booking-section-body max-w-md">
            <NhisCheck
              memberNumber={nhisMemberNumber}
              onMemberNumberChange={setNhisMemberNumber}
              onVerified={(result) => {
                setNhisActive(result.status === "VERIFIED");
                setNhisExpiryDate(result.validUntil ?? "");
              }}
              onContinueSelfPay={() => setPayerType("CASH")}
            />
          </div>
        </div>
      )}

      <div className="booking-section">
        <div className="booking-section-header">
          <h3 className="booking-section-title">Visit details</h3>
        </div>
        <div className="booking-section-body">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Reason for the visit" className="md:col-span-2">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fever and headache for 2 days"
              />
            </Field>
            <Field label="Referral source (optional)">
              <Input
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                placeholder="e.g. Self, another facility"
              />
            </Field>
            <Field label="Notes (optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else worth noting"
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
          disabled={bookMut.isPending || !serviceId || !reason.trim()}
        >
          {bookMut.isPending ? (
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
  const when = a.scheduledFor ? format(new Date(a.scheduledFor), "EEE d MMM 'at' HH:mm") : "the booked time";
  const withDoctor = a.clinicianName ? ` with ${a.clinicianName}` : "";

  return (
    <SuccessPanel
      title={`Appointment booked for ${when}${withDoctor}.`}
      description={`${booking.serviceName} · GH₵ ${minorToGhs(a.feeMinor)} · ${PAYER_LABEL[a.payerType] ?? a.payerType}. A bill opens in Finance once the appointment is marked completed.`}
      actions={[
        { label: "Print appointment slip", variant: "outline", onClick: () => window.print() },
        { label: "Go to today's queue", variant: "outline", onClick: onGoToQueue },
        { label: "Book another", variant: "default", onClick: onAnother },
      ]}
    />
  );
}
