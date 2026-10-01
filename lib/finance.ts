import type { PillTone } from "@/components/common/status-pill";
import type { FinanceNhisClaimDto, ServicePricingDto } from "@/types/finance.types";

// ── NHIS claim states (05-ui-copy §5) ─────────────────────────────────────
// Backend: DRAFT → READY → SUBMITTED → PAID | REJECTED | ACTION_REQUIRED; fixes go back to READY / SUBMITTED.

const CLAIM: Record<string, { label: string; tone: PillTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  READY: { label: "Ready to send", tone: "info" },
  SUBMITTED: { label: "Sent", tone: "pending" },
  PAID: { label: "Accepted", tone: "success" },
  ACTION_REQUIRED: { label: "Questioned", tone: "warning" },
  REJECTED: { label: "Rejected", tone: "error" },
};

export function claimStatus(status: string): { label: string; tone: PillTone } {
  return CLAIM[(status ?? "").toUpperCase()] ?? CLAIM.DRAFT;
}

export type ClaimTab = "ACTION" | "DRAFT" | "READY" | "SUBMITTED" | "PAID";

export const CLAIM_TABS: { tab: ClaimTab; label: string; statuses: string[] }[] = [
  { tab: "ACTION", label: "Needs action", statuses: ["ACTION_REQUIRED", "REJECTED"] },
  { tab: "DRAFT", label: "Draft", statuses: ["DRAFT"] },
  { tab: "READY", label: "Ready to send", statuses: ["READY"] },
  { tab: "SUBMITTED", label: "Sent", statuses: ["SUBMITTED"] },
  { tab: "PAID", label: "Accepted", statuses: ["PAID"] },
];

/** Claim lines and amounts can only change in these states (FinanceService.updateNhisClaim). */
export function claimEditable(status: string): boolean {
  return ["DRAFT", "READY", "ACTION_REQUIRED", "REJECTED"].includes((status ?? "").toUpperCase());
}

// The reason NHIS gave is kept at the end of the claim notes as "NHIS said: …" (no reason field yet —
// backend-gaps.md#FIN-07-response).
const REASON_MARK = "NHIS said:";

export function claimReason(claim: Pick<FinanceNhisClaimDto, "notes">): string | null {
  const i = (claim.notes ?? "").lastIndexOf(REASON_MARK);
  if (i < 0) return null;
  return claim.notes.slice(i + REASON_MARK.length).trim() || null;
}

export function notesWithReason(notes: string, reason: string): string {
  const base = (notes ?? "").split(REASON_MARK)[0].trim();
  return [base, `${REASON_MARK} ${reason.trim()}`].filter(Boolean).join("\n");
}

/** Common NHIS answers, in plain words (J09). */
export const NHIS_REASONS = [
  "The patient's NHIS wasn't active on the visit date.",
  "This medicine isn't on the NHIS medicines list.",
  "A claim for this visit was already sent.",
  "The diagnosis doesn't support the services claimed.",
  "Missing or wrong NHIS price code.",
  "Other",
] as const;

/** Bill number inside an automatic draft's reference ("DRAFT-BIL-2026-000004" → "BIL-2026-000004"). */
export function billNumberFromClaim(claim: Pick<FinanceNhisClaimDto, "claimReference">): string | null {
  const m = /^DRAFT-(.+)$/i.exec(claim.claimReference ?? "");
  return m ? m[1] : null;
}

// ── Prices ────────────────────────────────────────────────────────────────

/** Patient types the price list is kept for, in the order they're shown. */
export const PRICE_PAYERS = [
  { code: "CASH", label: "Self-pay" },
  { code: "NHIS", label: "NHIS" },
  { code: "CORPORATE", label: "Company" },
  { code: "INSURANCE_PRIVATE", label: "Private insurance" },
] as const;

/** The price that applies on `day` ("YYYY-MM-DD"): active, started on or before that day, latest start wins. */
export function priceOn(rows: ServicePricingDto[], serviceId: string, payer: string, day: string): ServicePricingDto | null {
  return (
    rows
      .filter((r) => r.active && r.serviceId === serviceId && r.payerType === payer && (r.effectiveFrom ?? "0000") <= day && (!r.effectiveTo || r.effectiveTo >= day))
      .sort((a, b) => (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""))[0] ?? null
  );
}

/** A price that starts after `day`, if one is set. */
export function nextPrice(rows: ServicePricingDto[], serviceId: string, payer: string, day: string): ServicePricingDto | null {
  return (
    rows
      .filter((r) => r.active && r.serviceId === serviceId && r.payerType === payer && (r.effectiveFrom ?? "") > day)
      .sort((a, b) => (a.effectiveFrom ?? "").localeCompare(b.effectiveFrom ?? ""))[0] ?? null
  );
}

const STREAM: Record<string, string> = {
  IGF: "Paid at the hospital",
  NHIS: "NHIS",
  PRIVATE_INSURANCE: "Private insurance",
  INSURANCE_PRIVATE: "Private insurance",
  CORPORATE: "Companies",
  DONOR: "Donors",
  CAPITATION: "NHIS capitation",
};

export function streamLabel(code: string): string {
  return STREAM[(code ?? "").toUpperCase()] ?? "Other";
}
