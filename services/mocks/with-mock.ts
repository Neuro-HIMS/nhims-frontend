import { isMockEnabled } from "./mock-config";

/**
 * Picks the mock or the real implementation for one service method.
 * The mock path adds a realistic delay and can be made to fail with
 * `?mockError=<area>` in the page URL, so error states get exercised too.
 */
export async function withMock<T>(area: string, realFn: () => Promise<T>, mockFn: () => Promise<T> | T): Promise<T> {
  if (!isMockEnabled(area)) return realFn();

  await delay(300 + Math.random() * 500);

  if (shouldSimulateError(area)) {
    throw new MockError(area);
  }

  return mockFn();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldSimulateError(area: string): boolean {
  if (typeof window === "undefined") return false;
  const target = new URLSearchParams(window.location.search).get("mockError");
  return target === area;
}

/** Shaped so `lib/api-errors.ts` maps it the same way it maps a real Axios error. */
export class MockError extends Error {
  response = { status: 500, data: { message: "Sample data error (forced by ?mockError)." } };

  constructor(area: string) {
    super(`Mock error for "${area}" (forced by ?mockError=${area})`);
    this.name = "MockError";
  }
}
