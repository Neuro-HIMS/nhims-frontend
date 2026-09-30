import type { PillTone } from "@/components/common/status-pill";
import type { LabFlag } from "@/components/clinical/lab-result-value";
import type { LabOrderDto } from "@/types/clinical.types";

// ── Labels (05-ui-copy §5) ────────────────────────────────────────────────

const LAB_STATUS: Record<string, { label: string; tone: PillTone }> = {
  ORDERED: { label: "Requested", tone: "neutral" },
  PAID: { label: "Ready for sample", tone: "pending" },
  CLAIMED: { label: "Ready for sample", tone: "pending" },
  IN_PROGRESS: { label: "Being tested", tone: "info" },
  COMPLETED: { label: "Result entered", tone: "purple" },
  AUTHORISED: { label: "Result ready", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function labStatus(status: string): { label: string; tone: PillTone } {
  return LAB_STATUS[status] ?? { label: "Requested", tone: "neutral" };
}

export type LabUrgency = "ROUTINE" | "URGENT" | "STAT";

/** The backend also knows EMERGENCY; both it and STAT read as "Immediately". */
export function labUrgencyLabel(priority: string): string {
  if (priority === "STAT" || priority === "EMERGENCY") return "Immediately";
  if (priority === "URGENT") return "Urgent";
  return "Routine";
}

/** For the shared urgency sort (emergency first). */
export function labUrgencyAsTriage(priority: string): "EMERGENCY" | "URGENT" | "ROUTINE" {
  if (priority === "STAT" || priority === "EMERGENCY") return "EMERGENCY";
  if (priority === "URGENT") return "URGENT";
  return "ROUTINE";
}

/**
 * Self-pay tests wait for the cashier before the sample is taken (J02). NHIS orders are
 * claimed automatically; company-paid visits are billed later.
 */
export function isSelfPay(payerType: string | null | undefined): boolean {
  const p = (payerType ?? "").trim().toUpperCase();
  return p === "CASH" || p === "SELF" || p === "SELF_PAY";
}

export function isWaitingToPay(o: Pick<LabOrderDto, "status" | "payerType">): boolean {
  return o.status === "ORDERED" && isSelfPay(o.payerType);
}

export const LAB_OPEN_STATUSES = ["ORDERED", "PAID", "CLAIMED", "IN_PROGRESS"] as const;

// ── What each test measures, and its normal ranges ────────────────────────

export interface LabRange {
  /** Only for this sex; omit for both. */
  sex?: "M" | "F";
  /** Age band in years: from (inclusive) … to (exclusive). */
  fromAge?: number;
  toAge?: number;
  low?: number;
  high?: number;
}

export interface LabParameter {
  /** What's measured, e.g. "Haemoglobin". Sent as the result row's analyte. */
  name: string;
  unit: string;
  kind: "number" | "choice" | "text";
  /** For `choice`: the answers offered, e.g. ["Negative", "Positive"]. */
  choices?: string[];
  /** For `choice`: answers that are abnormal (flagged High). */
  abnormalChoices?: string[];
  /** For `number`: normal ranges, most specific first. */
  ranges?: LabRange[];
  criticalLow?: number;
  criticalHigh?: number;
}

export interface LabTestSetup {
  serviceId: string;
  parameters: LabParameter[];
  /** Default sample type, e.g. "Whole blood (EDTA)". */
  sampleType: string;
}

export function rangeFor(p: LabParameter, ageYears: number | null, sex: string | null): LabRange | null {
  const ranges = p.ranges ?? [];
  return (
    ranges.find(
      (r) =>
        (!r.sex || r.sex === sex) &&
        (r.fromAge == null || (ageYears != null && ageYears >= r.fromAge)) &&
        (r.toAge == null || (ageYears != null && ageYears < r.toAge)),
    ) ?? null
  );
}

export function describeLabRange(p: LabParameter, ageYears: number | null, sex: string | null): string {
  if (p.kind === "choice") {
    const normal = (p.choices ?? []).filter((c) => !(p.abnormalChoices ?? []).includes(c));
    return normal.length ? normal.join(" / ") : "";
  }
  if (p.kind === "text") return "";
  const r = rangeFor(p, ageYears, sex);
  if (!r) return "";
  const unit = p.unit ? ` ${p.unit}` : "";
  if (r.low != null && r.high != null) return `${r.low}–${r.high}${unit}`;
  if (r.low != null) return `${r.low}${unit} or more`;
  if (r.high != null) return `${r.high}${unit} or less`;
  return "";
}

/** Flag for one result. Critical limits are strict (e.g. below 7, not at 7). Blank → null (nothing to flag). */
export function flagResult(p: LabParameter, raw: string, ageYears: number | null, sex: string | null): LabFlag | null {
  const value = raw.trim();
  if (!value) return null;
  if (p.kind === "choice") {
    return (p.abnormalChoices ?? []).includes(value) ? "ABNORMAL" : "NORMAL";
  }
  if (p.kind === "text") return "NORMAL";
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (p.criticalLow != null && n < p.criticalLow) return "CRITICAL";
  if (p.criticalHigh != null && n > p.criticalHigh) return "CRITICAL";
  const r = rangeFor(p, ageYears, sex);
  // Ranges exist but none fits (age or sex unknown, or outside every band): don't guess "Normal".
  if (!r) return (p.ranges ?? []).length > 0 ? null : "NORMAL";
  if (r.low != null && n < r.low) return "LOW";
  if (r.high != null && n > r.high) return "HIGH";
  return "NORMAL";
}

/** Flags as the backend stores them on result rows ("" = normal). "CRITICAL" raises the critical alert. */
export function flagForRecord(flag: LabFlag | null): string {
  if (!flag || flag === "NORMAL") return "";
  return flag;
}

/** Read a stored row flag back into a LabFlag (older rows used "H"/"L"/"HH"/"LL"/"ABNORMAL"). */
export function storedFlag(raw: string | null | undefined): LabFlag {
  const f = (raw ?? "").trim().toUpperCase();
  if (!f || f === "N" || f === "NORMAL" || f === "OK") return "NORMAL";
  if (f === "CRITICAL" || f === "HH" || f === "LL" || f === "C") return "CRITICAL";
  if (f === "LOW" || f === "L") return "LOW";
  if (f === "ABNORMAL" || f === "A" || f === "POSITIVE") return "ABNORMAL";
  return "HIGH";
}
