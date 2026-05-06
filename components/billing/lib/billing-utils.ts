import type { BillStatus } from "@/types/billing.types";

export const BILL_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  INVOICED: "Invoiced",
  PARTIAL: "Partial",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  WRITTEN_OFF: "Written off",
};

export function billStatusPill(status: BillStatus | string): string {
  const cls =
    status === "PAID"
      ? "status-pill-active"
      : status === "PARTIAL"
      ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]"
      : status === "OPEN" || status === "INVOICED"
      ? "status-pill-pending"
      : "status-pill-inactive";
  return `status-pill text-xs ${cls}`;
}

export const CHARGE_KIND_FALLBACK = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "LAB", label: "Laboratory" },
  { value: "IMAGING", label: "Imaging / Radiology" },
  { value: "PHARMACY", label: "Pharmacy / Medication" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "WARD", label: "Ward / Bed" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "DENTAL", label: "Dental" },
  { value: "THEATRE", label: "Theatre" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "OTHER", label: "Other / Supplies" },
];

export const CHARGE_KIND_ICON: Record<string, string> = {
  CONSULTATION: "🩺",
  LAB: "🧪",
  IMAGING: "📷",
  PHARMACY: "💊",
  PROCEDURE: "⚕️",
  WARD: "🛏️",
  MATERNITY: "👶",
  DENTAL: "🦷",
  THEATRE: "🏥",
  EMERGENCY: "🚨",
  OTHER: "📦",
};

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
