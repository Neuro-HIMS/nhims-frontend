import type { PillTone } from "@/components/common/status-pill";
import type { IpdMarEntryDto } from "@/types/ipd.types";

// ── Beds ──────────────────────────────────────────────────────────────────

export type BedState = "FREE" | "OCCUPIED" | "GOING_HOME" | "CLEANING";

const BED: Record<BedState, { label: string; tone: PillTone }> = {
  FREE: { label: "Free", tone: "success" },
  OCCUPIED: { label: "Occupied", tone: "info" },
  GOING_HOME: { label: "Going home", tone: "pending" },
  CLEANING: { label: "Being cleaned", tone: "warning" },
};

export function bedState(state: BedState): { label: string; tone: PillTone } {
  return BED[state];
}

/** "Day 3" — day 1 is the day of admission. */
export function dayOfStay(admittedAt: string | null | undefined, now = new Date()): number | null {
  if (!admittedAt) return null;
  const start = new Date(admittedAt);
  if (Number.isNaN(start.getTime())) return null;
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Ward + bed key used to match admissions (free text) to beds. */
export function bedKey(ward: string, bed: string): string {
  return `${ward.trim().toLowerCase()}|${bed.trim().toLowerCase()}`;
}

// ── Medicines given (MAR) ─────────────────────────────────────────────────

export type MarView = "DUE_NOW" | "OVERDUE" | "NOT_DUE" | "GIVEN" | "HELD" | "MISSED";

const MAR: Record<MarView, { label: string; tone: PillTone }> = {
  DUE_NOW: { label: "Due now", tone: "warning" },
  OVERDUE: { label: "Overdue", tone: "error" },
  NOT_DUE: { label: "Not due yet", tone: "neutral" },
  GIVEN: { label: "Given", tone: "success" },
  HELD: { label: "Held back", tone: "neutral" },
  MISSED: { label: "Missed", tone: "error" },
};

/** How late a dose can be and still count as "due now" rather than missed (shown, not saved). */
const DUE_WINDOW_MS = 60 * 60_000;

export function marView(entry: Pick<IpdMarEntryDto, "status" | "scheduledFor">, now = Date.now()): MarView {
  const s = (entry.status ?? "").toUpperCase();
  if (s === "GIVEN") return "GIVEN";
  if (s === "HELD") return "HELD";
  if (s === "MISSED") return "MISSED";
  const at = new Date(entry.scheduledFor).getTime();
  if (Number.isNaN(at)) return "DUE_NOW";
  if (at - now > DUE_WINDOW_MS) return "NOT_DUE";
  if (now - at > DUE_WINDOW_MS) return "OVERDUE";
  return "DUE_NOW";
}

export function marStatus(v: MarView): { label: string; tone: PillTone } {
  return MAR[v];
}

/** A dose still to do (due or not yet due), as opposed to one already dealt with. */
export function marOpen(entry: Pick<IpdMarEntryDto, "status">): boolean {
  return (entry.status ?? "DUE").toUpperCase() === "DUE";
}

export const HELD_REASONS = ["Patient refused", "Patient asleep or away from the ward", "Nil by mouth", "Medicine not available", "Doctor stopped it", "Other"] as const;

// ── Discharge ─────────────────────────────────────────────────────────────

/** Outcomes offered, mapped to the backend's codes. */
export const DISCHARGE_OUTCOMES = [
  { code: "IMPROVED", label: "Went home — better" },
  { code: "STABLE", label: "Went home — no change" },
  { code: "TRANSFERRED", label: "Moved to another facility" },
  { code: "AMA", label: "Left against medical advice" },
  { code: "DECEASED", label: "Died" },
] as const;

// ── Ward set-up labels ────────────────────────────────────────────────────

export const WARD_KINDS = [
  { code: "GENERAL", label: "General (medical)" },
  { code: "SURGICAL", label: "Surgical" },
  { code: "MATERNITY", label: "Maternity" },
  { code: "CHILDREN", label: "Children" },
  { code: "INTENSIVE", label: "Intensive care" },
  { code: "ISOLATION", label: "Isolation" },
  { code: "PRIVATE", label: "Private" },
  { code: "OTHER", label: "Other" },
] as const;

export const WARD_FOR = [
  { code: "MEN", label: "Men" },
  { code: "WOMEN", label: "Women" },
  { code: "CHILDREN", label: "Children" },
  { code: "MIXED", label: "Anyone" },
] as const;

export const BED_KINDS = [
  { code: "STANDARD", label: "Standard" },
  { code: "PRIVATE", label: "Private room" },
  { code: "INTENSIVE", label: "Intensive care" },
  { code: "COT", label: "Cot" },
  { code: "DELIVERY", label: "Delivery bed" },
] as const;

export function bedKindLabel(kind: string): string {
  return BED_KINDS.find((k) => k.code === kind)?.label ?? "Standard";
}

export function wardKindLabel(kind: string): string {
  return WARD_KINDS.find((k) => k.code === kind)?.label ?? "Other";
}

export function wardForLabel(code: string): string {
  return WARD_FOR.find((k) => k.code === code)?.label ?? "Anyone";
}
