/**
 * Which mock "areas" are active. Set `NEXT_PUBLIC_MOCK_AREAS=all` or a comma list
 * (e.g. `NEXT_PUBLIC_MOCK_AREAS=notifications,anc-pnc`) in `.env.local`. Always off
 * in production builds, regardless of the env var.
 */
const MOCK_AREAS = (process.env.NEXT_PUBLIC_MOCK_AREAS ?? "").trim();

export function isMockEnabled(area: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (!MOCK_AREAS) return false;
  if (MOCK_AREAS === "all") return true;
  return MOCK_AREAS.split(",").map((a) => a.trim()).includes(area);
}

/** True when any mock area is active — drives the dev-only "Sample data" indicator. */
export function isAnyMockEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return MOCK_AREAS.length > 0;
}
