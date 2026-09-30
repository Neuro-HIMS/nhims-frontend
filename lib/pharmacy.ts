import type { PillTone } from "@/components/common/status-pill";
import type { MedicalAlertDto, PrescriptionDto } from "@/types/clinical.types";
import type { StockOverviewStatus } from "@/types/pharmacy-inventory.types";

// ── Labels (05-ui-copy §5) ────────────────────────────────────────────────

const RX: Record<string, { label: string; tone: PillTone }> = {
  ORDERED: { label: "Prescribed", tone: "neutral" },
  AWAITING_PAYMENT: { label: "Waiting to pay", tone: "pending" },
  READY: { label: "Ready to collect", tone: "info" },
  PARTIALLY_DISPENSED: { label: "Partly given", tone: "warning" },
  DISPENSED: { label: "Given", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function rxStatus(status: string): { label: string; tone: PillTone } {
  return RX[status] ?? RX.ORDERED;
}

const STOCK: Record<StockOverviewStatus | "EXPIRED", { label: string; tone: PillTone }> = {
  ADEQUATE: { label: "In stock", tone: "success" },
  LOW: { label: "Low stock", tone: "warning" },
  OUT: { label: "Out of stock", tone: "error" },
  EXPIRING_SOON: { label: "Expiring soon", tone: "warning" },
  EXPIRED: { label: "Expired", tone: "error" },
};

export function stockStatus(status: string | null | undefined): { label: string; tone: PillTone } {
  return STOCK[(status ?? "OUT") as StockOverviewStatus] ?? STOCK.OUT;
}

/** True when a medicine's earliest batch expiry is already past (so it holds expired stock). */
export function hasExpiredStock(nearestExpiry: string | null | undefined, today = new Date()): boolean {
  if (!nearestExpiry) return false;
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return nearestExpiry.slice(0, 10) < t;
}

const MOVEMENT: Record<string, string> = {
  RECEIPT: "Delivery received",
  DISPENSE: "Given to a patient",
  ADJUSTMENT_IN: "Added (adjustment)",
  ADJUSTMENT_OUT: "Removed (adjustment)",
};

export function movementLabel(type: string): string {
  return MOVEMENT[type] ?? "Other change";
}

/** Prescriptions the pharmacy can't give yet: self-pay lines waiting for the cashier. */
export function isRxWaitingToPay(rx: Pick<PrescriptionDto, "status">): boolean {
  return rx.status === "AWAITING_PAYMENT" || rx.status === "ORDERED";
}

// ── How often, and quantity maths ─────────────────────────────────────────

export interface Frequency {
  code: string;
  label: string;
  /** Doses per day; null for "as needed" / one-off. */
  perDay: number | null;
}

/** Chips offered to the doctor (DOC-07). `code` is what's stored on the line. */
export const FREQUENCIES: Frequency[] = [
  { code: "OD", label: "Once a day", perDay: 1 },
  { code: "BD", label: "Twice a day", perDay: 2 },
  { code: "TDS", label: "Three times a day", perDay: 3 },
  { code: "QID", label: "Four times a day", perDay: 4 },
  { code: "NOCTE", label: "At night", perDay: 1 },
  { code: "PRN", label: "When needed", perDay: null },
  { code: "STAT", label: "Once, now", perDay: null },
];

export function frequencyLabel(code: string | null | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  return FREQUENCIES.find((f) => f.code === c)?.label ?? (code ?? "");
}

/** Units to supply: units per dose × doses per day × days (rounded up). Null when it can't be worked out. */
export function suggestedQuantity(unitsPerDose: number, frequencyCode: string, days: number): number | null {
  const f = FREQUENCIES.find((x) => x.code === frequencyCode);
  if (!f) return null;
  if (f.code === "STAT") return Math.max(1, Math.ceil(unitsPerDose));
  if (!f.perDay || !Number.isFinite(unitsPerDose) || unitsPerDose <= 0 || !Number.isFinite(days) || days <= 0) return null;
  return Math.ceil(unitsPerDose * f.perDay * days);
}

export const ROUTES = ["By mouth", "Injection into a vein", "Injection into a muscle", "Under the skin", "On the skin", "Inhaled", "Into the eye", "Into the ear", "Rectal"] as const;

// ── Allergy check (mirrors the backend so the doctor is warned before sending) ──

/** Allergy words that stand for a whole group of medicines. */
const ALLERGY_GROUPS: Record<string, string[]> = {
  penicillin: ["penicillin", "amoxicillin", "ampicillin", "cloxacillin", "flucloxacillin", "co-amoxiclav", "augmentin", "benzylpenicillin", "piperacillin"],
  sulfa: ["sulfa", "sulpha", "co-trimoxazole", "cotrimoxazole", "septrin", "sulfadoxine", "sulfamethoxazole"],
  nsaid: ["ibuprofen", "diclofenac", "aspirin", "naproxen", "indomethacin", "piroxicam"],
  cephalosporin: ["ceftriaxone", "cefuroxime", "cefixime", "cephalexin", "cefalexin", "cefotaxime"],
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((t) => t.replace(/[^a-z0-9\-+]/g, ""))
    .filter((t) => t.length >= 3);
}

/**
 * The allergy (if any) that a drug may clash with. Uses active ALLERGY alerts (what the
 * backend checks and blocks on) plus the patient's recorded allergy text, and knows a few
 * drug groups (e.g. a penicillin allergy clashes with amoxicillin).
 */
export function allergyClash(
  drugName: string,
  alerts: Pick<MedicalAlertDto, "category" | "label" | "notes" | "active">[],
  knownAllergies: string | null | undefined,
): { allergy: string; blocking: boolean } | null {
  const drug = drugName.toLowerCase();
  const direct = (allergyText: string) => tokens(allergyText).some((t) => drug.includes(t));
  const viaGroup = (allergyText: string) =>
    tokens(allergyText).some((t) => {
      const group = Object.entries(ALLERGY_GROUPS).find(([key, members]) => t.includes(key) || members.includes(t));
      return group ? group[1].some((m) => drug.includes(m)) : false;
    });
  for (const a of alerts) {
    if (!a.active || a.category !== "ALLERGY") continue;
    const text = `${a.label} ${a.notes ?? ""}`;
    // A direct word match is what the backend blocks on — it can't be overridden here.
    if (direct(text)) return { allergy: a.label, blocking: true };
    if (viaGroup(text)) return { allergy: a.label, blocking: false };
  }
  const known = (knownAllergies ?? "").trim();
  if (known && !/^no known|^none/i.test(known) && (direct(known) || viaGroup(known))) return { allergy: known, blocking: false };
  return null;
}
