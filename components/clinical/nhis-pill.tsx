import { cn } from "@/lib/utils";

export type NhisStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "UNKNOWN" | "PENDING";

const LABELS: Record<NhisStatus, string> = {
  ACTIVE: "NHIS active",
  INACTIVE: "NHIS expired",
  SUSPENDED: "NHIS suspended",
  UNKNOWN: "NHIS not confirmed yet",
  PENDING: "NHIS not confirmed yet",
};

const TONE_CLASS: Record<NhisStatus, string> = {
  ACTIVE: "status-pill-success",
  INACTIVE: "status-pill-error",
  SUSPENDED: "status-pill-error",
  UNKNOWN: "status-pill-pending",
  PENDING: "status-pill-pending",
};

/** NHIS membership pill — same three outcomes everywhere a patient's cover is shown. */
export function NhisPill({ status, className }: { status: NhisStatus; className?: string }) {
  return <span className={cn("status-pill", TONE_CLASS[status], className)}>{LABELS[status]}</span>;
}
