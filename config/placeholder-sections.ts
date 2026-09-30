import type { AppModule } from "@/types/auth.types";

/**
 * Sections that have a route and a menu entry but no screens yet.
 * Hidden from the menu (and redirected by `proxy.ts`) unless
 * NEXT_PUBLIC_ENABLE_PLACEHOLDER_SPECIALTY_ROUTES=true, in which case they show
 * the plain "This section isn't ready yet." page. Remove a module from this list
 * when its real screens ship.
 */
export const PLACEHOLDER_MODULES: AppModule[] = [
  "emergency",
  "surgery",
  "dental",
  "mental-health",
  "physiotherapy",
  "blood-bank",
];

export const SHOW_PLACEHOLDER_SECTIONS = process.env.NEXT_PUBLIC_ENABLE_PLACEHOLDER_SPECIALTY_ROUTES === "true";

/** True when a section should be left out of the menu because it has no screens yet. */
export function isHiddenPlaceholder(module: AppModule): boolean {
  return !SHOW_PLACEHOLDER_SECTIONS && PLACEHOLDER_MODULES.includes(module);
}
