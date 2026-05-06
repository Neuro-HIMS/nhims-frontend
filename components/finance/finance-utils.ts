import type { ApiError } from "@/types/api.types";

/**
 * Convert a minor-units integer (pesewas) to a GHS-formatted string with two
 * decimals. Money values across the finance module ride as `*Minor` numbers,
 * so this is the single conversion path the UI uses for display.
 */
export function minorToGhs(minor: number | null | undefined): string {
  const v = typeof minor === "number" ? minor : 0;
  return (v / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a GHS amount string ("1,250.50") back to integer pesewas.
 * Returns NaN if the user typed something we shouldn't try to bill against.
 */
export function ghsInputToMinor(raw: string): number {
  const cleaned = (raw ?? "").replace(/,/g, "").trim();
  if (!cleaned) return NaN;
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

export function showApiError(error: unknown, fallback = "Request failed"): string {
  const ax = error as { response?: { data?: ApiError }; message?: string };
  return ax.response?.data?.message ?? ax.message ?? fallback;
}

export const PAYER_LABEL: Record<string, string> = {
  NHIS: "NHIS",
  IGF: "IGF (Cash)",
  CASH: "Cash / IGF",
  INSURANCE_PRIVATE: "Private Insurance",
  CORPORATE: "Corporate",
  DONOR: "Donor-funded",
  CAPITATION: "NHIS Capitation",
};

export const STREAM_LABEL: Record<string, string> = {
  IGF: "IGF (Internally Generated Funds)",
  NHIS: "NHIS Reimbursable",
  PRIVATE_INSURANCE: "Private Insurance",
  CORPORATE: "Corporate",
  DONOR: "Donor",
  CAPITATION: "NHIS Capitation",
  OTHER: "Other",
};

export const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  MOMO_MTN: "MoMo · MTN",
  MOMO_VODAFONE: "MoMo · Telecel",
  MOMO_AIRTELTIGO: "MoMo · AirtelTigo",
  BANK_CARD: "Bank Card",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  NHIS_REIMBURSEMENT: "NHIS Reimbursement",
  INSURANCE_PAYOUT: "Insurance Payout",
  WAIVER: "Waiver",
};
