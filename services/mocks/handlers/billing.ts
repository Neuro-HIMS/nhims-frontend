/** In-memory payment reversals for the `payment-reverse` area (backend-gaps.md#BIL-07). */
export interface PaymentReversal {
  paymentId: string;
  reason: string;
  reversedAt: string;
}

const reversals = new Map<string, PaymentReversal>();

export function mockReversePayment(paymentId: string, reason: string): PaymentReversal {
  const r = { paymentId, reason, reversedAt: new Date().toISOString() };
  reversals.set(paymentId, r);
  return r;
}

export function mockListReversals(): PaymentReversal[] {
  return [...reversals.values()];
}
