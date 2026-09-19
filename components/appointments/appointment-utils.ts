import { VISIT_TYPES } from "@/components/booking/lib/booking-types";

const VISIT_TYPE_LABELS: Record<string, string> = Object.fromEntries(VISIT_TYPES.map((v) => [v.value, v.label]));

export function visitTypeLabel(v: string): string {
  return VISIT_TYPE_LABELS[v] ?? v;
}
