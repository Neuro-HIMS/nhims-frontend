"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const SUB_NAV = [
  { label: "Today's Queue", view: "queue", href: "/appointments?view=queue" },
  { label: "Calendar", view: "calendar", href: "/appointments?view=calendar" },
  { label: "History", view: "history", href: "/appointments?view=history" },
];

const APPOINTMENT_TYPES = [
  "General OPD",
  "ANC Follow-up",
  "Post-natal",
  "Chronic Disease Clinic",
  "Eye Clinic",
  "ENT Clinic",
  "Physiotherapy",
  "Dental",
  "Lab Review",
  "Specialist Referral",
];

type Appointment = {
  id: string;
  time: string;
  patientName: string;
  patientId: string;
  type: string;
  clinician: string;
  status: "scheduled" | "checked-in" | "seen" | "missed";
};

export function AppointmentsWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "queue";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Appointments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Appointment scheduling, today&apos;s queue, and history.
        </p>
      </div>

      <ModuleSubNav items={SUB_NAV} basePath="/appointments" />

      <div className="pt-2">
        {view === "queue" && <QueueView />}
        {view === "calendar" && <CalendarView />}
        {view === "history" && <HistoryView />}
      </div>
    </div>
  );
}

/* ── Today's Queue ────────────────────────────────────────── */

function QueueView() {
  const [appointments, setAppointments] = useState<Appointment[]>(TODAY_APPOINTMENTS);
  const [showBook, setShowBook] = useState(false);
  const [newAppt, setNewAppt] = useState({ patientId: "", patientName: "", time: "", type: "General OPD", clinician: "" });

  const STATUS_STYLES: Record<Appointment["status"], string> = {
    "scheduled": "status-pill status-pill-pending",
    "checked-in": "status-pill bg-[hsl(var(--clinical-semi-urgent-bg))] text-[hsl(var(--clinical-semi-urgent))]",
    "seen": "status-pill status-pill-active",
    "missed": "status-pill status-pill-inactive",
  };

  const STATUS_LABELS: Record<Appointment["status"], string> = {
    "scheduled": "Scheduled",
    "checked-in": "Checked In",
    "seen": "Seen",
    "missed": "Missed",
  };

  function checkIn(id: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id && a.status === "scheduled" ? { ...a, status: "checked-in" } : a))
    );
  }

  const counts = {
    total: appointments.length,
    checkedIn: appointments.filter((a) => a.status === "checked-in").length,
    seen: appointments.filter((a) => a.status === "seen").length,
    scheduled: appointments.filter((a) => a.status === "scheduled").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Today", value: counts.total },
          { label: "Scheduled", value: counts.scheduled },
          { label: "Checked In", value: counts.checkedIn },
          { label: "Seen", value: counts.seen },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="stat-card-label">{s.label}</p>
              <p className="stat-card-value">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Saturday, 3 May 2026
        </p>
        <Button size="sm" onClick={() => setShowBook(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient</th>
              <th className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Type</th>
              <th className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">Clinician</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appointments.map((appt) => (
              <tr key={appt.id} className="table-row-interactive">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-clinical text-sm text-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {appt.time}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{appt.patientName}</p>
                  <p className="patient-id mt-0.5">{appt.patientId}</p>
                </td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                  {appt.type}
                </td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                  {appt.clinician}
                </td>
                <td className="px-4 py-3">
                  <span className={`${STATUS_STYLES[appt.status]} text-xs`}>
                    {STATUS_LABELS[appt.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {appt.status === "scheduled" && (
                    <Button variant="outline" size="sm" onClick={() => checkIn(appt.id)}>
                      Check In
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Book appointment dialog */}
      <Dialog open={showBook} onOpenChange={setShowBook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Patient ID</label>
                <Input
                  value={newAppt.patientId}
                  onChange={(e) => setNewAppt((p) => ({ ...p, patientId: e.target.value }))}
                  placeholder="GH-2026-XXXXX"
                  className="font-clinical"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Patient Name</label>
                <Input
                  value={newAppt.patientName}
                  onChange={(e) => setNewAppt((p) => ({ ...p, patientName: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Appointment Time</label>
                <Input
                  type="time"
                  value={newAppt.time}
                  onChange={(e) => setNewAppt((p) => ({ ...p, time: e.target.value }))}
                  className="font-clinical"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select value={newAppt.type} onValueChange={(v) => setNewAppt((p) => ({ ...p, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Clinician</label>
                <Input
                  value={newAppt.clinician}
                  onChange={(e) => setNewAppt((p) => ({ ...p, clinician: e.target.value }))}
                  placeholder="e.g. Dr. Asante"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBook(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newAppt.patientId || !newAppt.time) return;
                setAppointments((prev) => [
                  ...prev,
                  {
                    id: `appt-${Date.now()}`,
                    time: newAppt.time,
                    patientName: newAppt.patientName || "Unknown",
                    patientId: newAppt.patientId,
                    type: newAppt.type,
                    clinician: newAppt.clinician || "—",
                    status: "scheduled",
                  },
                ]);
                setNewAppt({ patientId: "", patientName: "", time: "", type: "General OPD", clinician: "" });
                setShowBook(false);
              }}
            >
              Book Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Calendar View ────────────────────────────────────────── */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarView() {
  const today = new Date(2026, 4, 3); // May 3 2026
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const selectedDayAppts = selectedDay
    ? TODAY_APPOINTMENTS.filter((_, i) => i % 7 === ((selectedDay - 1) % 7))
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {MONTH_NAMES[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0.5">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday =
                year === today.getFullYear() &&
                month === today.getMonth() &&
                day === today.getDate();
              const isSelected = selectedDay === day;
              const hasAppt = day % 3 === 0 || day % 5 === 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative flex h-8 w-full items-center justify-center rounded text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isToday
                      ? "border border-primary font-semibold text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {day}
                  {hasAppt && !isSelected && (
                    <span
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ background: "hsl(var(--accent))" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedDay ? `${MONTH_NAMES[month]} ${selectedDay}` : "Select a day"}
          </CardTitle>
          <CardDescription>
            {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDayAppts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No appointments for this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <span className="font-clinical text-sm text-muted-foreground w-12 shrink-0">{a.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">{a.type}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">{a.clinician}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── History ──────────────────────────────────────────────── */

function HistoryView() {
  const [query, setQuery] = useState("");

  const filtered = PAST_APPOINTMENTS.filter(
    (a) =>
      !query.trim() ||
      a.patientName.toLowerCase().includes(query.toLowerCase()) ||
      a.patientId.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search past appointments by patient name or ID…"
        className="max-w-md"
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Clinician</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((a) => (
              <tr key={a.id} className="table-row-interactive">
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">{a.date}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{a.patientName}</p>
                  <p className="patient-id mt-0.5">{a.patientId}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.type}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.clinician}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill text-xs ${a.outcome === "Seen" ? "status-pill-active" : "status-pill-inactive"}`}>
                    {a.outcome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Mock data ────────────────────────────────────────────── */

const TODAY_APPOINTMENTS: Appointment[] = [
  { id: "a1", time: "08:00", patientName: "Kofi Acheampong", patientId: "GH-2026-04821", type: "General OPD", clinician: "Dr. Asante", status: "seen" },
  { id: "a2", time: "08:30", patientName: "Abena Osei", patientId: "GH-2026-03109", type: "ANC Follow-up", clinician: "Midwife Adwoa", status: "checked-in" },
  { id: "a3", time: "09:00", patientName: "Kwame Mensah", patientId: "GH-2026-01774", type: "Chronic Disease Clinic", clinician: "Dr. Boateng", status: "scheduled" },
  { id: "a4", time: "09:30", patientName: "Esi Yeboah", patientId: "GH-2026-05512", type: "General OPD", clinician: "Dr. Asante", status: "scheduled" },
  { id: "a5", time: "10:00", patientName: "Yaw Darko", patientId: "GH-2025-99201", type: "Lab Review", clinician: "Dr. Boateng", status: "missed" },
  { id: "a6", time: "10:30", patientName: "Akua Asante", patientId: "GH-2026-06002", type: "General OPD", clinician: "Dr. Asante", status: "scheduled" },
  { id: "a7", time: "11:00", patientName: "Nana Boateng", patientId: "GH-2026-06118", type: "Eye Clinic", clinician: "Dr. Kufour", status: "scheduled" },
];

const PAST_APPOINTMENTS = [
  { id: "p1", date: "2026-05-02", patientName: "Kofi Acheampong", patientId: "GH-2026-04821", type: "General OPD", clinician: "Dr. Asante", outcome: "Seen" },
  { id: "p2", date: "2026-04-28", patientName: "Abena Osei", patientId: "GH-2026-03109", type: "ANC 3rd Visit", clinician: "Midwife Adwoa", outcome: "Seen" },
  { id: "p3", date: "2026-04-25", patientName: "Yaw Darko", patientId: "GH-2025-99201", type: "Chronic Disease Clinic", clinician: "Dr. Boateng", outcome: "No Show" },
  { id: "p4", date: "2026-04-22", patientName: "Kwame Mensah", patientId: "GH-2026-01774", type: "Lab Review", clinician: "Dr. Boateng", outcome: "Seen" },
  { id: "p5", date: "2026-04-18", patientName: "Esi Yeboah", patientId: "GH-2026-05512", type: "General OPD", clinician: "Dr. Asante", outcome: "Seen" },
];
