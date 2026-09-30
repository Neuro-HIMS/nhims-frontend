import type { PillTone } from "@/components/common/status-pill";
import type { RadiologyOrderDto } from "@/types/clinical.types";

// 05-ui-copy §5 — imaging statuses.
const STATUS: Record<string, { label: string; tone: PillTone }> = {
  ORDERED: { label: "Requested", tone: "neutral" },
  READY: { label: "Ready for scan", tone: "pending" },
  IN_PROGRESS: { label: "Scanning", tone: "info" },
  COMPLETED: { label: "Report ready", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function imagingStatus(status: string): { label: string; tone: PillTone } {
  return STATUS[status] ?? STATUS.ORDERED;
}

/** Unpaid scans stay "Requested" until the cashier takes payment (NHIS scans go straight to "Ready for scan"). */
export function isScanWaitingToPay(o: Pick<RadiologyOrderDto, "status">): boolean {
  return o.status === "ORDERED";
}

/** Women of child-bearing age: ask about pregnancy before X-ray or CT. */
export function needsPregnancyCheck(o: Pick<RadiologyOrderDto, "patientSex" | "patientDob" | "modality">): boolean {
  if (!(o.patientSex ?? "").toUpperCase().startsWith("F")) return false;
  const modality = (o.modality ?? "").toUpperCase();
  if (!(modality.includes("X-RAY") || modality === "CT" || modality === "IMAGING")) return false;
  if (!o.patientDob) return true;
  const age = (Date.now() - new Date(o.patientDob).getTime()) / (365.25 * 24 * 3600 * 1000);
  return !Number.isFinite(age) || (age >= 12 && age <= 50);
}

// ── Report text ⇄ sections ────────────────────────────────────────────────
// The backend stores one report text; we keep the three parts as labelled sections inside it.

export interface ReportSections {
  findings: string;
  impression: string;
  recommendations: string;
}

const HEADINGS: Array<[keyof ReportSections, string]> = [
  ["findings", "Findings"],
  ["impression", "Impression"],
  ["recommendations", "Recommendations"],
];

export function composeReport(s: ReportSections): string {
  return HEADINGS.filter(([k]) => s[k].trim())
    .map(([k, h]) => `${h}:\n${s[k].trim()}`)
    .join("\n\n");
}

/** Splits a stored report back into sections; older free-text reports come back as findings. */
export function parseReport(text: string | null | undefined): ReportSections {
  const out: ReportSections = { findings: "", impression: "", recommendations: "" };
  const raw = (text ?? "").trim();
  if (!raw) return out;
  const re = /^(Findings|Impression|Recommendations):\s*$/gim;
  // A heading only starts a section when it comes in order and hasn't been used yet; any other
  // "Findings:" line typed inside a section stays part of that section's text.
  const order = ["findings", "impression", "recommendations"];
  let next = 0;
  const marks = [...raw.matchAll(re)].filter((m) => {
    const idx = order.indexOf(m[1].toLowerCase());
    if (idx < next) return false;
    next = idx + 1;
    return true;
  });
  if (marks.length === 0) {
    out.findings = raw;
    return out;
  }
  const before = raw.slice(0, marks[0].index ?? 0).trim();
  if (before) out.findings = before;
  marks.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index ?? raw.length : raw.length;
    const key = m[1].toLowerCase() as keyof ReportSections;
    out[key] = [out[key], raw.slice(start, end).trim()].filter(Boolean).join("\n\n");
  });
  return out;
}
