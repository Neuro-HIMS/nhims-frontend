"use client";

import { useMemo, useState } from "react";
import { Calendar, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { CLINICIANS, SERVICE_CATALOG } from "@/components/records/lib/records-data";
import { createDefaultAppointmentForm, type AppointmentForm, type Patient, type VisitType } from "@/components/records/lib/records-types";
import { DateTimePicker } from "@/components/records/shared/date-time-picker";
import { RecordsField } from "@/components/records/shared/records-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useEncountersStore } from "@/store/encounters.store";

export function AppointmentBookingCard({
  patient,
  title,
  description,
}: {
  patient: Patient;
  title: string;
  description: string;
}) {
  const [form, setForm] = useState<AppointmentForm>(() => createDefaultAppointmentForm());
  const [bookedVisitNo, setBookedVisitNo] = useState<string | null>(null);
  const bookVisit = useEncountersStore((s) => s.bookVisit);
  const addBillingItem = useEncountersStore((s) => s.addBillingItem);

  const selectedService = useMemo(
    () => SERVICE_CATALOG.find((service) => service.id === form.serviceId),
    [form.serviceId]
  );

  const canBook =
    form.appointmentDate &&
    form.appointmentTime &&
    form.serviceId &&
    form.clinicianId &&
    form.reason.trim();

  function update<K extends keyof AppointmentForm>(key: K, value: AppointmentForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function onVisitTypeChange(value: VisitType) {
    setForm((previous) => ({
      ...previous,
      visitType: value,
      serviceId: "",
      price: 0,
      clinicianId: "",
    }));
  }

  function onServiceChange(serviceId: string) {
    const service = SERVICE_CATALOG.find((item) => item.id === serviceId);
    setForm((previous) => ({
      ...previous,
      serviceId,
      price: service?.price ?? 0,
      clinicianId: "",
    }));
  }

  function handleBook() {
    if (!canBook) return;
    const service = SERVICE_CATALOG.find((s) => s.id === form.serviceId);
    const clinician = CLINICIANS.find((c) => c.id === form.clinicianId);
    const visit = bookVisit({
      patientId: patient.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientSex: patient.sex,
      patientDob: patient.dob,
      patientPhone: patient.phone,
      visitType: form.visitType,
      serviceId: form.serviceId,
      serviceName: service?.name ?? "",
      department: service?.department ?? "",
      clinicianId: form.clinicianId,
      clinicianName: clinician?.fullName ?? form.clinicianId,
      fee: form.price,
      sponsor: patient.nhisStatus === "active" ? "NHIS" : "SELF PAY / UNINSURED - GH",
      scheme: patient.nhisStatus === "active" ? "NATIONAL HEALTH INSURANCE" : "SELF PAY",
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      reason: form.reason.trim(),
      priority: form.priority === "urgent" ? "urgent" : "pending",
      status: "awaiting-triage",
      source: "records",
    });
    addBillingItem({
      visitId: visit.id,
      patientId: visit.patientId,
      kind: "consultation",
      description: `${visit.serviceName} (${visit.visitNo})`,
      quantity: 1,
      unitPrice: visit.fee,
      sponsor: visit.sponsor,
      serviced: false,
      status: visit.sponsor === "NHIS" ? "claimed" : "pending",
      sourceRef: visit.id,
      createdBy: "Records Officer",
    });
    setBookedVisitNo(visit.visitNo);
    toast.success("Patient routed to Nurse Station", {
      description: `${visit.visitNo} · ${service?.department ?? ""} · ${form.appointmentTime} · GHS ${form.price.toFixed(2)}`,
    });
  }

  const filteredServices = SERVICE_CATALOG.filter((service) => service.visitType === form.visitType);
  const filteredClinicians = CLINICIANS.filter((clinician) =>
    selectedService ? clinician.department === selectedService.department : true
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="font-medium text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="patient-id mt-0.5">
            {patient.patientId} - {patient.phone} - {patient.district}
          </p>
        </div>

        {bookedVisitNo ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-900">
            <p className="font-medium">Appointment booked - patient routed to Nurse Station</p>
            <p className="mt-1 font-clinical">
              Visit {bookedVisitNo} · {form.appointmentDate} {form.appointmentTime} · {selectedService?.name ?? "Service"}
            </p>
            <p className="mt-1">Billable amount: GHS {form.price.toFixed(2)}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RecordsField label="Appointment Date & Time *" className="sm:col-span-2">
                <DateTimePicker
                  date={form.appointmentDate}
                  time={form.appointmentTime}
                  onDateChange={(value) => update("appointmentDate", value)}
                  onTimeChange={(value) => update("appointmentTime", value)}
                />
              </RecordsField>
              <RecordsField label="Visit Type">
                <Select value={form.visitType} onValueChange={onVisitTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opd">OPD</SelectItem>
                    <SelectItem value="anc">ANC</SelectItem>
                    <SelectItem value="lab">Laboratory</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="ward">Ward Review</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Priority">
                <Select
                  value={form.priority}
                  onValueChange={(value: AppointmentForm["priority"]) => update("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Service / Department *" className="sm:col-span-2">
                <Select value={form.serviceId} onValueChange={onServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - GHS {service.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="Price (Billing) *">
                <Input value={form.price ? `GHS ${form.price.toFixed(2)}` : ""} readOnly className="font-clinical" />
              </RecordsField>
              <RecordsField label="Assigned Clinician *">
                <Input
                  list="clinician-options"
                  value={form.clinicianId}
                  onChange={(event) => update("clinicianId", event.target.value)}
                  placeholder="Search clinician"
                />
                <datalist id="clinician-options">
                  {filteredClinicians.map((clinician) => (
                    <option key={clinician.id} value={clinician.id}>
                      {clinician.fullName} ({clinician.cadre})
                    </option>
                  ))}
                </datalist>
              </RecordsField>
              <RecordsField label="Referral Source">
                <Input
                  value={form.referralSource}
                  onChange={(event) => update("referralSource", event.target.value)}
                  placeholder="Optional"
                />
              </RecordsField>
            </div>

            <RecordsField label="Visit Reason *">
              <Textarea
                value={form.reason}
                onChange={(event) => update("reason", event.target.value)}
                placeholder="Short clinical complaint or reason for visit"
              />
            </RecordsField>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Defaulted to current date
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Service price flows to billing
                </span>
              </div>
              <Button onClick={handleBook} disabled={!canBook}>
                Book Appointment
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

