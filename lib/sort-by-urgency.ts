import type { TriagePriorityCode } from "@/types/clinical.types";

const URGENCY_ORDER: Record<TriagePriorityCode | "PENDING", number> = {
  EMERGENCY: 0,
  URGENT: 1,
  SEMI_URGENT: 2,
  ROUTINE: 3,
  PENDING: 4,
};

/**
 * Every queue in the app (nurse, doctor, lab, imaging, pharmacy) sorts the same
 * way: most urgent first, then whoever has been waiting longest (FR-OPD-001).
 */
export function sortByUrgencyThenArrival<T>(
  items: T[],
  getPriority: (item: T) => TriagePriorityCode | "PENDING",
  getArrivedAt: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const byUrgency = URGENCY_ORDER[getPriority(a)] - URGENCY_ORDER[getPriority(b)];
    if (byUrgency !== 0) return byUrgency;
    return getArrivedAt(a).localeCompare(getArrivedAt(b));
  });
}
