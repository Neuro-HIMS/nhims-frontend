/**
 * Patient public ID pattern: {@code FACILITYCODE-12345678-YY}
 * (8 random digits + last two digits of registration year).
 */

/** Uppercase A–Z / 0–9 only, strips spaces and punctuation except hyphens are rebuilt. */
export function formatPatientPublicIdLive(raw: string): string {
  const flat = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!flat) return "";

  if (flat.length >= 12) {
    const yy = flat.slice(-2);
    const mid = flat.slice(-10, -2);
    const code = flat.slice(0, -10);
    if (/^\d{8}$/.test(mid) && /^\d{2}$/.test(yy)) {
      return `${code}-${mid}-${yy}`;
    }
  }

  const firstDigit = flat.search(/\d/);
  if (firstDigit > 0) {
    return `${flat.slice(0, firstDigit)}-${flat.slice(firstDigit)}`;
  }

  return flat;
}
