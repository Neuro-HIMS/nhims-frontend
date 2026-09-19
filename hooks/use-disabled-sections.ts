import { WORKSPACE_APP_MODULES } from "@/config/navigation";
import { isModuleEnabledAtFacility } from "@/lib/access-control";
import { useAuthStore } from "@/store/auth.store";
import type { AppModule } from "@/types/auth.types";
import { PLACEHOLDER_CLINICAL_MODULES } from "@/components/users/users-management-constants";

/**
 * Sections that can't be assigned to staff right now: not-yet-built modules, plus
 * whatever the facility has switched off (facility-wide — the signed-in admin's own
 * `enabledHmisModuleKeys` applies the same to every staff member, not just them).
 */
export function useDisabledSections(): ReadonlySet<AppModule> {
  const user = useAuthStore((s) => s.user);

  const facilityOff = user
    ? WORKSPACE_APP_MODULES.filter((m) => !isModuleEnabledAtFacility(user, m))
    : [];

  return new Set<AppModule>([...PLACEHOLDER_CLINICAL_MODULES, ...facilityOff]);
}
