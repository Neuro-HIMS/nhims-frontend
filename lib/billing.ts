import type { PillTone } from "@/components/common/status-pill";
import type { BillDto, BillItemDto, PaymentDto } from "@/types/finance.types";

// ── Money ─────────────────────────────────────────────────────────────────

/** "GH₵ 1,250.50" from pesewas. */
export function formatMoney(minor: number | null | undefined): string {
  const v = typeof minor === "number" && Number.isFinite(minor) ? minor : 0;
  return `GH₵ ${(v / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Pesewas from what the cashier typed ("1,250.50"); NaN when it isn't a usable amount. */
export function parseMoney(raw: string): number {
  const cleaned = (raw ?? "").replace(/[,\s]/g, "").replace(/^GH₵/i, "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return NaN;
  return Math.round(Number.parseFloat(cleaned) * 100);
}

// ── Labels (05-ui-copy §5) ────────────────────────────────────────────────

const BILL: Record<string, { label: string; tone: PillTone }> = {
  OPEN: { label: "Waiting for payment", tone: "pending" },
  INVOICED: { label: "Waiting for payment", tone: "pending" },
  PARTIAL: { label: "Part paid", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  WRITTEN_OFF: { label: "Written off", tone: "neutral" },
};

export function billStatus(bill: Pick<BillDto, "status" | "balanceMinor">): {
  label: string;
  tone: PillTone;
} {
  // A fully NHIS-covered bill is "Paid" with nothing to collect — say so plainly.
  return BILL[bill.status] ?? BILL.OPEN;
}

export function isWaitingForPayment(
  bill: Pick<BillDto, "status" | "balanceMinor">,
): boolean {
  return (
    (bill.status === "OPEN" ||
      bill.status === "INVOICED" ||
      bill.status === "PARTIAL") &&
    bill.balanceMinor > 0
  );
}

const GROUP: Record<string, string> = {
  CONSULTATION: "Consultation",
  LAB: "Lab tests",
  IMAGING: "Scans",
  PHARMACY: "Medicines",
  PROCEDURE: "Procedures",
  WARD: "Ward stay",
  MATERNITY: "Maternity",
  DENTAL: "Dental",
  THEATRE: "Theatre",
  EMERGENCY: "Emergency",
  OTHER: "Other",
};

export function chargeGroupLabel(group: string | null | undefined): string {
  return GROUP[(group ?? "").toUpperCase()] ?? "Other";
}

export const PAYER: Record<string, string> = {
  NHIS: "NHIS",
  CASH: "Self-pay",
  IGF: "Self-pay",
  INSURANCE_PRIVATE: "Private insurance",
  CORPORATE: "Company",
  DONOR: "Donor",
  CAPITATION: "NHIS capitation",
};

export function payerLabel(payer: string | null | undefined): string {
  return PAYER[(payer ?? "").toUpperCase()] ?? "Self-pay";
}

/** How the cashier groups methods on screen; the stored method stays the backend code. */
export type MethodKind = "CASH" | "MOMO" | "CARD" | "BANK";

export const METHOD_KINDS: { kind: MethodKind; label: string }[] = [
  { kind: "CASH", label: "Cash" },
  { kind: "MOMO", label: "Mobile Money" },
  { kind: "CARD", label: "Card" },
  { kind: "BANK", label: "Bank transfer or cheque" },
];

export const MOMO_NETWORKS = [
  { code: "MOMO_MTN", label: "MTN" },
  { code: "MOMO_VODAFONE", label: "Telecel" },
  { code: "MOMO_AIRTELTIGO", label: "AirtelTigo" },
] as const;

const METHOD: Record<string, string> = {
  CASH: "Cash",
  MOMO_MTN: "Mobile Money (MTN)",
  MOMO_VODAFONE: "Mobile Money (Telecel)",
  MOMO_AIRTELTIGO: "Mobile Money (AirtelTigo)",
  BANK_CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  NHIS_REIMBURSEMENT: "NHIS payment",
  INSURANCE_PAYOUT: "Insurance payment",
};

export function methodLabel(method: string | null | undefined): string {
  return METHOD[(method ?? "").toUpperCase()] ?? "Other";
}

export function methodKind(
  method: string | null | undefined,
): MethodKind | "OTHER" {
  const m = (method ?? "").toUpperCase();
  if (m === "CASH") return "CASH";
  if (m.startsWith("MOMO_")) return "MOMO";
  if (m === "BANK_CARD") return "CARD";
  if (m === "BANK_TRANSFER" || m === "CHEQUE") return "BANK";
  return "OTHER";
}

// ── Sums ──────────────────────────────────────────────────────────────────

/** What the patient pays on a line after NHIS and line discount. */
export function patientShare(
  item: Pick<BillItemDto, "lineTotalMinor" | "nhisCoveredMinor">,
): number {
  return Math.max(0, item.lineTotalMinor - item.nhisCoveredMinor);
}

/** What the patient pays on the whole bill (before payments). */
export function billPatientPays(
  bill: Pick<BillDto, "totalMinor" | "nhisCoveredMinor">,
): number {
  return Math.max(0, bill.totalMinor - bill.nhisCoveredMinor);
}

/** Money the cashier actually took (cash, Mobile Money, card, bank) — not NHIS/insurance payouts or waivers. */
export function isTakenAtDesk(method: string | null | undefined): boolean {
  return methodKind(method) !== "OTHER";
}

export function totalsByMethod(
  payments: Pick<PaymentDto, "method" | "amountMinor">[],
): Record<MethodKind | "OTHER", number> {
  const out: Record<MethodKind | "OTHER", number> = {
    CASH: 0,
    MOMO: 0,
    CARD: 0,
    BANK: 0,
    OTHER: 0,
  };
  for (const p of payments) out[methodKind(p.method)] += p.amountMinor;
  return out;
}

/** Local calendar day "2026-09-30" of an ISO time (null when missing). */
export function localDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayLocal(): string {
  return localDay(new Date().toISOString())!;
}

/** Local day `n` days before today ("2026-09-24" for 6 days before the 30th). */
export function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDay(d.toISOString())!;
}

/** A draft charge without the screen-only fields, ready to send. */
export function toChargeInput<T extends { rowId: string; displayName: string }>(
  draft: T,
): Omit<T, "rowId" | "displayName"> {
  const out: Partial<T> = { ...draft };
  delete out.rowId;
  delete out.displayName;
  return out as Omit<T, "rowId" | "displayName">;
}
