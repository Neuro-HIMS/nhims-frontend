"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceOption } from "@/components/ui/choice-option";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { NhisCheck } from "@/components/records/nhis-check";
import type { Patient } from "@/components/records/lib/records-types";
import { SearchablePicker } from "@/components/common/searchable-picker";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { appointmentsService } from "@/services/appointments.service";
import type { AppointmentDto, AppointmentPriority, VisitType } from "@/types/appointments.types";
import type { NhisVerificationResultDto } from "@/types/patients.types";

const WHERE_TO_OPTIONS: Array<{ value: VisitType; label: string }> = [
  { value: "OPD", label: "OPD" },
  { value: "ANC", label: "ANC" },
  { value: "LAB", label: "Lab only" },
  { value: "RADIOLOGY", label: "Imaging only" },
  { value: "EMERGENCY", label: "Emergency" },
];

type PayWay = "NHIS" | "CASH" | "CORPORATE";

const PAY_OPTIONS: Array<{ value: PayWay; label: string }> = [
  { value: "NHIS", label: "NHIS" },
  { value: "CASH", label: "Self-pay" },
  { value: "CORPORATE", label: "Company" },
];

const PRIORITY_OPTIONS: Array<{ value: AppointmentPriority; label: string }> = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
];

/**
 * Rendered only while a patient is selected (see call sites) so each open is
 * a fresh mount — that gives every field a clean lazy-initial value without
 * a reset-on-open effect.
 */
export function StartVisitDialog({
  onOpenChange,
  patient,
  onStarted,
}: {
  onOpenChange: (next: boolean) => void;
  patient: Patient;
  onStarted?: (appointment: AppointmentDto) => void;
}) {
  const queryClient = useQueryClient();

  const [visitType, setVisitType] = useState<VisitType>("OPD");
  const [reason, setReason] = useState("");
  const [clinicianUserId, setClinicianUserId] = useState<string>("__any__");
  const [payWay, setPayWay] = useState<PayWay>(patient.nhisStatus === "active" ? "NHIS" : "CASH");
  const [nhisMemberNumber, setNhisMemberNumber] = useState(patient.nhisCard ?? "");
  const [nhisVerification, setNhisVerification] = useState<NhisVerificationResultDto | null>(null);
  const [priority, setPriority] = useState<AppointmentPriority>("ROUTINE");

  const cliniciansQuery = useQuery({
    queryKey: queryKeys.appointments.clinicians,
    queryFn: () => appointmentsService.clinicians(),
    staleTime: 60_000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!patient.id) throw new Error("Select a patient first");
      const clinician = cliniciansQuery.data?.find((c) => c.userId === clinicianUserId);
      const booked = await appointmentsService.book({
        patientId: patient.id,
        scheduledFor: new Date().toISOString(),
        visitType,
        payerType: payWay,
        nhisMemberNumber: payWay === "NHIS" ? nhisMemberNumber.trim() : undefined,
        // Use the fresh re-check when there is one; otherwise fall back to the patient's
        // last-known status rather than assuming inactive just because no one re-checked today.
        nhisActive:
          payWay === "NHIS"
            ? nhisVerification
              ? nhisVerification.status === "VERIFIED"
              : patient.nhisStatus === "active"
            : undefined,
        clinicianUserId: clinician?.userId ?? null,
        clinicianName: clinician?.fullName,
        priority,
        reason: reason.trim(),
      });
      return appointmentsService.checkIn(booked.id);
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinical.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
      toast.success("Visit started", {
        description: `${patient.firstName} ${patient.lastName} is now waiting for the nurse. Visit number ${appointment.appointmentNumber}.`,
      });
      onStarted?.(appointment);
      onOpenChange(false);
    },
    onError: (error) => {
      const friendly = getFriendlyError(error);
      toast.error(friendly.title, { description: friendly.message });
    },
  });

  const tileRow = "grid grid-cols-2 gap-2 sm:grid-cols-3";

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      size="lg"
      title={`Start today's visit for ${patient.firstName} ${patient.lastName}`}
      description="Send this patient to the nurse to begin their visit today."
      onSubmit={() => {
        if (patient?.id && !startMutation.isPending) startMutation.mutate();
      }}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!patient?.id || startMutation.isPending}>
            {startMutation.isPending ? "Sending…" : "Send to nurse"}
          </Button>
        </>
      }
    >
      <FormDialogSection title="Where to" columns={1}>
        <RadioGroup
          aria-label="Where to"
          value={visitType}
          onValueChange={(v) => setVisitType(v as VisitType)}
          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          {WHERE_TO_OPTIONS.map((opt) => (
            <ChoiceOption key={opt.value}>
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </ChoiceOption>
          ))}
        </RadioGroup>
      </FormDialogSection>

      <FormDialogSection title="About the visit">
        <div className="space-y-1.5">
          <Label htmlFor="start-visit-reason">Reason</Label>
          <Input
            id="start-visit-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Fever and headache for 2 days"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start-visit-doctor">Doctor (optional)</Label>
          <SearchablePicker
            id="start-visit-doctor"
            value={clinicianUserId}
            onChange={setClinicianUserId}
            loading={cliniciansQuery.isPending}
            searchPlaceholder="Doctor's name"
            options={[{ value: "__any__", label: "Any available doctor" }, ...(cliniciansQuery.data ?? []).map((c) => ({ value: c.userId, label: c.fullName }))]}
          />
        </div>
      </FormDialogSection>

      <FormDialogSection title="Payment and priority" columns={1}>
        <div className="space-y-2">
          <Label>How they&apos;ll pay</Label>
          <RadioGroup aria-label="How they'll pay" value={payWay} onValueChange={(v) => setPayWay(v as PayWay)} className={tileRow}>
            {PAY_OPTIONS.map((opt) => (
              <ChoiceOption key={opt.value}>
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </ChoiceOption>
            ))}
          </RadioGroup>
          {payWay === "NHIS" && (
            <NhisCheck
              memberNumber={nhisMemberNumber}
              onMemberNumberChange={setNhisMemberNumber}
              onVerified={setNhisVerification}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <RadioGroup
            aria-label="Priority"
            value={priority}
            onValueChange={(v) => setPriority(v as AppointmentPriority)}
            className={tileRow}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <ChoiceOption key={opt.value}>
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </ChoiceOption>
            ))}
          </RadioGroup>
          {priority === "EMERGENCY" && (
            <InlineNotice tone="warning">
              Take the patient to Emergency now; you can finish details later.
            </InlineNotice>
          )}
        </div>
      </FormDialogSection>
    </FormDialog>
  );
}
