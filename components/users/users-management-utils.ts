import { formatTableDateTime } from "@/lib/dates";

export function formatLastLogin(value: string | null): string {
  if (!value) return "Never signed in";
  return formatTableDateTime(value);
}
