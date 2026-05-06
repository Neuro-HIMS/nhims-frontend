import type { ServicePricingDto } from "@/types/finance.types";
import type { VisitType } from "@/types/appointments.types";

/**
 * Map an appointment visit type onto the finance service-group codes
 * that should be selectable in the booking form.
 */
export function visitTypeToGroups(visitType: VisitType): string[] {
  switch (visitType) {
    case "OPD":
      return ["CONSULTATION", "PROCEDURE"];
    case "ANC":
    case "POSTNATAL":
      return ["MATERNITY", "CONSULTATION"];
    case "LAB":
      return ["LAB"];
    case "RADIOLOGY":
      return ["IMAGING"];
    case "WARD":
      return ["WARD", "CONSULTATION"];
    case "EMERGENCY":
      return ["EMERGENCY", "CONSULTATION", "PROCEDURE"];
    case "DENTAL":
      return ["DENTAL"];
    case "PHARMACY":
      return ["PHARMACY"];
    case "SPECIALIST":
      return ["CONSULTATION"];
    case "FOLLOW_UP":
      return ["CONSULTATION"];
    default:
      return [];
  }
}

/**
 * Resolve the active tariff for a service+payer pair, falling back to the
 * CASH price when the requested payer is not configured. Returns null when
 * no service has been picked yet.
 */
export function lookupTariff(
  pricing: ServicePricingDto[],
  serviceId: string,
  payerType: string,
): ServicePricingDto | null {
  if (!serviceId) return null;
  const direct = pricing.find(
    (p) => p.active && p.serviceId === serviceId && p.payerType === payerType,
  );
  if (direct) return direct;
  const cash = pricing.find(
    (p) => p.active && p.serviceId === serviceId && p.payerType === "CASH",
  );
  return cash ?? null;
}

export function prettyRole(role: string): string {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
