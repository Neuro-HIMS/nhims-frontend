import type { AppointmentStatus, AppointmentDto } from "@/types/appointments.types";

export const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
  CANCELLED: "Cancelled",
};

export function statusPillClass(status: string): string {
  switch (status) {
    case "SCHEDULED":   return "appt-pill appt-pill-scheduled";
    case "CHECKED_IN":  return "appt-pill appt-pill-checked-in";
    case "IN_PROGRESS": return "appt-pill appt-pill-in-progress";
    case "COMPLETED":   return "appt-pill appt-pill-completed";
    case "NO_SHOW":     return "appt-pill appt-pill-no-show";
    case "CANCELLED":   return "appt-pill appt-pill-cancelled";
    default:            return "appt-pill appt-pill-cancelled";
  }
}

export function visitTypeLabel(v: string): string {
  return v.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function nextStatusActions(a: AppointmentDto): AppointmentStatus[] {
  switch (a.status) {
    case "SCHEDULED":   return ["CHECKED_IN", "CANCELLED", "NO_SHOW"];
    case "CHECKED_IN":  return ["IN_PROGRESS", "CANCELLED", "NO_SHOW"];
    case "IN_PROGRESS": return ["COMPLETED"];
    default:            return [];
  }
}

export function isSameLocalDate(iso: string | null, day: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear()
      && d.getMonth() === day.getMonth()
      && d.getDate() === day.getDate();
}
