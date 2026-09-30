import type { EncounterDto } from "@/types/clinical.types";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/**
 * `GET /clinical/encounters/today` also returns visits *booked* today for a later date
 * (e.g. a follow-up in two weeks) — see backend-gaps.md#DOC-13-today-list. Those don't
 * belong on today's waiting lists: keep a booked visit only when it is booked for today.
 */
export function isOnTodaysList(e: EncounterDto): boolean {
  if (e.status !== "SCHEDULED") return true;
  return !e.scheduledFor || isToday(e.scheduledFor);
}
