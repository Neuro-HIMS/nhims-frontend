import type { SurveillanceFlagDto, SurveillanceFlagInput } from "@/services/surveillance.service";

// In-memory for the browser session; resets on reload (mock-layer rule).
const flags: SurveillanceFlagDto[] = [];

export async function mockFlagForSurveillance(input: SurveillanceFlagInput): Promise<SurveillanceFlagDto> {
  const existing = flags.find((f) => f.encounterId === input.encounterId && f.conditionId === input.conditionId);
  if (existing) return existing;
  const created: SurveillanceFlagDto = {
    id: `mock-sv-${flags.length + 1}`,
    ...input,
    flaggedAt: new Date().toISOString(),
  };
  flags.push(created);
  return created;
}
