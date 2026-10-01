/** NHIS answers (reasons) kept in memory for the `nhis-response` area — backend-gaps.md#FIN-07-response. */
const reasons = new Map<string, string>();

export function mockSaveClaimReason(claimId: string, reason: string): void {
  reasons.set(claimId, reason);
}

export function mockClaimReason(claimId: string): string | null {
  return reasons.get(claimId) ?? null;
}
