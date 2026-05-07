"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BookingFormDialog } from "@/components/booking/booking-form-dialog";
import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import type { Patient } from "@/components/records/lib/records-types";
import { appointmentsService } from "@/services/appointments.service";
import type { AppointmentDto } from "@/types/appointments.types";

function followUpWindowUtc() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 22);
  return { fromIso: start.toISOString(), toIsoExclusive: endExclusive.toISOString() };
}

/**
 * Lists scheduled follow-up appointments in a rolling window and reuses the standard booking flow with visit type FOLLOW_UP.
 */
export function OpdFollowupPlanner() {
  const qc = useQueryClient();
  const { fromIso, toIsoExclusive } = useMemo(() => followUpWindowUtc(), []);

  const followUpsQuery = useQuery({
    queryKey: ["appointments", "followups", fromIso, toIsoExclusive] as const,
    queryFn: () =>
      appointmentsService.search({
        status: "SCHEDULED",
        from: fromIso,
        to: toIsoExclusive,
        visitType: "FOLLOW_UP",
      }),
    staleTime: 30_000,
  });

  const [bookingPatient, setBookingPatient] = useState<Patient | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  function onSelectForBooking(patient: Patient) {
    if (!patient.id) {
      toast.error("Patient record is missing an internal id — cannot book.");
      return;
    }
    setBookingPatient(patient);
    setBookingOpen(true);
  }

  function onBooked(appt: AppointmentDto) {
    toast.success(`Follow-up booked (${appt.appointmentNumber})`);
    qc.invalidateQueries({ queryKey: ["appointments", "followups"] });
    setBookingOpen(false);
    setBookingPatient(null);
  }

  const rows = followUpsQuery.data ?? [];
  const loading = followUpsQuery.isLoading;

  function queryErrMsg(e: unknown): string {
    if (e && typeof e === "object" && "response" in e) {
      const data = (e as { response?: { data?: { message?: string } } }).response?.data;
      if (data?.message) return data.message;
    }
    if (e instanceof Error) return e.message;
    return "Could not load appointments.";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Book a follow-up visit</CardTitle>
          <CardDescription>
            Search for a patient, then schedule a return visit with visit type <span className="font-medium">FOLLOW_UP</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientSearchPanel
            cardTitle="Find patient"
            cardDescription="MPI search — same directory used elsewhere in the hospital."
            actionLabel="Book follow-up"
            onSelectPatient={onSelectForBooking}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming follow-up appointments</CardTitle>
          <CardDescription>
            Scheduled FOLLOW_UP visits in the next 21 days (UTC calendar window).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading appointments…
            </div>
          ) : followUpsQuery.isError ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{queryErrMsg(followUpsQuery.error)}</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No scheduled follow-ups in this window.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      When
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Patient
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Service
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Clinician
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                        {a.scheduledFor ? formatDateTime(a.scheduledFor) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{a.patientName}</p>
                        <p className="patient-id mt-0.5">{a.patientPublicId}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{a.serviceName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.clinicianName || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {a.patientId ? (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/nurse?view=folder&patientId=${encodeURIComponent(a.patientId)}`}>Folder</a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingFormDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        patient={bookingPatient}
        patientId={bookingPatient?.id ?? null}
        initialVisitType="FOLLOW_UP"
        onBooked={onBooked}
      />
    </div>
  );
}
