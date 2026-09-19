import { format, formatDistanceToNow, differenceInYears, parseISO } from "date-fns";

/**
 * Clinical date format: "12 Apr 2026"
 * Unambiguous — never use DD/MM/YY in clinical contexts.
 */
export function formatClinicalDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d MMM yyyy");
}

/**
 * Clinical date-time: "12 Apr 2026 · 09:47 AM"
 */
export function formatClinicalDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d MMM yyyy '·' hh:mm a");
}

/**
 * Time only: "09:47 AM"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "hh:mm a");
}

/**
 * Table/list date: "21/09/2026" — non-clinical admin screens (staff lists, activity
 * history). Clinical contexts keep the unambiguous `formatClinicalDate` above.
 */
export function formatTableDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Table/list date-time: "21/09/2026, 14:05" (24h).
 */
export function formatTableDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy, HH:mm");
}

/**
 * Relative time: "3 hours ago" — for queue wait times and notification recency.
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Calculate age from date of birth.
 * Returns: "45y" or "8m" (for infants under 1 year)
 */
export function formatAge(dob: Date | string): string {
  const d = typeof dob === "string" ? parseISO(dob) : dob;
  const years = differenceInYears(new Date(), d);
  if (years === 0) {
    const months = Math.floor(
      (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    return `${months}m`;
  }
  return `${years}y`;
}

/**
 * Format age + sex for clinical display: "M / 45y"
 */
export function formatAgeSex(
  dob: Date | string,
  sex: "MALE" | "FEMALE" | "INTERSEX"
): string {
  const sexLabel = sex === "MALE" ? "M" : sex === "FEMALE" ? "F" : "I";
  return `${sexLabel} / ${formatAge(dob)}`;
}

/**
 * ISO date to YYYY-MM-DD for API calls.
 */
export function toApiDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}