"use client";

import { CalendarPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingForm } from "@/components/booking/booking-form";
import { MiniPatientCard } from "@/components/booking/mini-patient-card";
import type { Patient } from "@/components/records/lib/records-types";
import type { AppointmentDto } from "@/types/appointments.types";

/**
 * Modal pop-up that hosts the booking form. Opens after the operator
 * selects a patient from the search results. The mini patient card is
 * pinned to the top-left of the dialog so identity stays visible while
 * the body scrolls. Layout intentionally mirrors the in-page booking
 * detail card so the experience is consistent.
 */
export function BookingFormDialog({
  open,
  onOpenChange,
  patient,
  patientId,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  patient: Patient | null;
  /** Real backend UUID for the patient — bookings need this, not the public ID. */
  patientId: string | null;
  onBooked?: (appt: AppointmentDto) => void;
}) {
  const ready = Boolean(patient && patientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 p-0 sm:max-w-3xl"
      >
        <div className="sticky top-0 z-10 rounded-t-xl border-b bg-popover/95 px-5 pt-5 pb-3 backdrop-blur supports-backdrop-filter:bg-popover/80">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                  Book appointment
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Service is sourced from the Finance catalog so the same name flows from booking
                  → completion → billing.
                </DialogDescription>
              </div>
            </div>
            {patient && (
              <div className="mt-3 flex">
                <div className="w-full max-w-sm">
                  <MiniPatientCard patient={patient} />
                </div>
              </div>
            )}
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {ready && patient && patientId ? (
            <BookingForm
              patient={patient}
              patientId={patientId}
              showPatientHeader={false}
              onBooked={onBooked}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a patient to start booking.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
