import type { TriagePriority, VisitStatus } from "@/lib/clinical-types";

export const NURSE_NAV = [
  { label: "Today's patients", view: "visits", href: "/nurse?view=visits" },
  { label: "Find a patient", view: "search", href: "/nurse?view=search" },
  { label: "Patient folder", view: "folder", href: "/nurse?view=folder" },
];

export const TRIAGE_LABELS: Record<TriagePriority, { label: string; rowClass: string; badgeClass: string }> = {
  emergency: {
    label: "Emergency",
    rowClass: "bg-[hsl(var(--clinical-emergency-bg))]",
    badgeClass: "bg-[hsl(var(--clinical-emergency))] text-white",
  },
  urgent: {
    label: "Urgent",
    rowClass: "bg-[hsl(var(--clinical-urgent-bg))]",
    badgeClass: "bg-[hsl(var(--clinical-urgent))] text-white",
  },
  semi: {
    label: "Semi-Urgent",
    rowClass: "bg-[hsl(var(--clinical-semi-urgent-bg))]",
    badgeClass: "bg-[hsl(var(--clinical-semi-urgent))] text-white",
  },
  routine: {
    label: "Routine",
    rowClass: "bg-[hsl(var(--clinical-routine-bg))]",
    badgeClass: "bg-[hsl(var(--clinical-routine))] text-white",
  },
  pending: {
    label: "Pending Triage",
    rowClass: "",
    badgeClass: "status-pill-pending",
  },
};

export const STATUS_LABEL: Record<VisitStatus, string> = {
  booked: "Booked",
  "checked-in": "Checked In",
  "awaiting-triage": "Awaiting Triage",
  "in-triage": "In Triage",
  "awaiting-vitals": "Awaiting Vitals",
  "in-vitals": "Recording Vitals",
  "awaiting-consultation": "Awaiting Consultation",
  "in-consultation": "In Consultation",
  "awaiting-lab": "Awaiting Lab",
  "awaiting-pharmacy": "Awaiting Pharmacy",
  admitted: "Admitted",
  discharged: "Discharged",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TRIAGE_ORDER: Record<TriagePriority, number> = {
  emergency: 0,
  urgent: 1,
  semi: 2,
  routine: 3,
  pending: 4,
};

export function calculateAge(dob: string): string {
  if (!dob || dob === "Unknown") return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}Y ${months}M ${days}D`;
}

export function calculateBmi(weightKg: string, heightCm: string): string {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm) / 100;
  if (!w || !h) return "";
  return (w / (h * h)).toFixed(1);
}

export function todayDateIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
