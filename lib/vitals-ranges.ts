/**
 * Plain reference ranges for flagging vitals in the UI — not a clinical
 * decision tool. Bands are approximate (infant <1y, child 1-11y, adult 12y+)
 * since paediatric norms vary a lot by exact age; good enough to prompt a
 * nurse to double-check, not to replace judgement.
 */

export interface VitalRange {
  low?: number;
  high?: number;
  dangerLow?: number;
  dangerHigh?: number;
  unit: string;
}

export type VitalKey = "systolic" | "diastolic" | "temperature" | "pulse" | "respiratoryRate" | "spo2";

/** Age in years, or null when unknown (then no range flags are shown rather than guessing adult ranges). */
export function ageInYears(birthDate: string | null, statedAgeValue: number | null, statedAgeUnit: string | null): number | null {
  if (birthDate) {
    const diff = Date.now() - new Date(birthDate).getTime();
    if (!Number.isNaN(diff)) return diff / (365.25 * 24 * 60 * 60 * 1000);
  }
  if (statedAgeValue != null) {
    const unit = (statedAgeUnit ?? "years").toLowerCase();
    if (unit.startsWith("month")) return statedAgeValue / 12;
    if (unit.startsWith("week")) return statedAgeValue / 52;
    if (unit.startsWith("day")) return statedAgeValue / 365;
    return statedAgeValue;
  }
  return null;
}

type AgeBand = "infant" | "child" | "adult";

function ageBandFor(ageYears: number): AgeBand {
  if (ageYears < 1) return "infant";
  if (ageYears < 12) return "child";
  return "adult";
}

const RANGES: Record<AgeBand, Record<VitalKey, VitalRange>> = {
  adult: {
    systolic: { low: 90, high: 140, dangerLow: 70, dangerHigh: 180, unit: "mmHg" },
    diastolic: { low: 60, high: 90, dangerLow: 40, dangerHigh: 120, unit: "mmHg" },
    temperature: { low: 36.1, high: 37.8, dangerLow: 35, dangerHigh: 39.5, unit: "°C" },
    pulse: { low: 60, high: 100, dangerLow: 40, dangerHigh: 150, unit: "/min" },
    respiratoryRate: { low: 12, high: 20, dangerLow: 8, dangerHigh: 30, unit: "/min" },
    spo2: { low: 95, dangerLow: 90, unit: "%" },
  },
  child: {
    systolic: { low: 80, high: 120, dangerLow: 60, dangerHigh: 140, unit: "mmHg" },
    diastolic: { low: 50, high: 80, dangerLow: 35, dangerHigh: 100, unit: "mmHg" },
    temperature: { low: 36.1, high: 37.8, dangerLow: 35, dangerHigh: 39.5, unit: "°C" },
    pulse: { low: 70, high: 120, dangerLow: 50, dangerHigh: 160, unit: "/min" },
    respiratoryRate: { low: 18, high: 30, dangerLow: 10, dangerHigh: 40, unit: "/min" },
    spo2: { low: 95, dangerLow: 90, unit: "%" },
  },
  infant: {
    systolic: { low: 70, high: 110, dangerLow: 50, dangerHigh: 130, unit: "mmHg" },
    diastolic: { low: 40, high: 70, dangerLow: 25, dangerHigh: 90, unit: "mmHg" },
    temperature: { low: 36.1, high: 37.8, dangerLow: 35, dangerHigh: 39.5, unit: "°C" },
    pulse: { low: 100, high: 160, dangerLow: 80, dangerHigh: 200, unit: "/min" },
    respiratoryRate: { low: 30, high: 50, dangerLow: 20, dangerHigh: 60, unit: "/min" },
    spo2: { low: 95, dangerLow: 90, unit: "%" },
  },
};

export function vitalRangeFor(key: VitalKey, ageYears: number): VitalRange {
  return RANGES[ageBandFor(ageYears)][key];
}

export type RangeFlag = "normal" | "low" | "high" | "danger-low" | "danger-high";

/** Where a value sits against the age-appropriate range. Danger bands are strict (e.g. SpO₂ below 90 %, not at 90). */
export function flagVital(key: VitalKey, value: number, ageYears: number): RangeFlag {
  const r = vitalRangeFor(key, ageYears);
  if (r.dangerLow != null && value < r.dangerLow) return "danger-low";
  if (r.dangerHigh != null && value > r.dangerHigh) return "danger-high";
  if (r.low != null && value < r.low) return "low";
  if (r.high != null && value > r.high) return "high";
  return "normal";
}

/** The usual range as words, from whichever bounds exist — e.g. "36.1–37.8 °C" or "95 % or more". */
export function describeRange(range: VitalRange): string {
  const unit = range.unit === "%" || range.unit.startsWith("/") ? range.unit : ` ${range.unit}`;
  if (range.low != null && range.high != null) return `${range.low}–${range.high}${unit}`;
  if (range.low != null) return `${range.low}${unit} or more`;
  if (range.high != null) return `${range.high}${unit} or less`;
  return "";
}

export function isDangerFlag(flag: RangeFlag): boolean {
  return flag === "danger-low" || flag === "danger-high";
}

export type BmiCategory = "Underweight" | "Healthy" | "Overweight" | "Obese";

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
