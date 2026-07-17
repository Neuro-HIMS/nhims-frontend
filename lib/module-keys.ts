import type { AppModule } from "@/types/auth.types";

/**
 * The backend stores and emits module keys as uppercase enum names
 * (e.g. "RECORDS", "MENTAL_HEALTH") — in JWT claims, auth responses, and the
 * users-admin DTOs. The app's AppModule keys are lowercase kebab-case
 * ("records", "mental-health"). Normalise at every API/JWT boundary so
 * routing, nav, and guard lookups never miss.
 */
export function normalizeModuleKey(key: string): AppModule {
  return key.trim().toLowerCase().replace(/_/g, "-") as AppModule;
}

export function normalizeModuleKeys(keys: readonly string[] | undefined): AppModule[] {
  return (keys ?? []).map(normalizeModuleKey);
}

/** Inverse mapping for payloads sent back to the backend (enum-name shape). */
export function toBackendModuleKey(module: AppModule): string {
  return module.toUpperCase().replace(/-/g, "_");
}
