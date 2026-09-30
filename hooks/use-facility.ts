import { useQuery } from "@tanstack/react-query";

import { isAdmin } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { facilityService } from "@/services/facility.service";
import { useAuthStore } from "@/store/auth.store";

/**
 * The single source of facility identity (name, code, logo, level, contact, service
 * switches). NHIMS runs one facility per server, so this never takes an id.
 * Callers should fall back to the session's facility fields while this is loading.
 *
 * Only administrators can read the facility settings (backend: FACILITY_ADMIN / SUPER_ADMIN);
 * everyone else uses the name, code and logo that come with their sign-in, so no request is made.
 */
export function useFacility() {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    queryKey: queryKeys.facility.profile,
    queryFn: () => facilityService.get(),
    staleTime: 5 * 60_000,
    enabled: Boolean(role && isAdmin(role)),
    retry: false,
  });
}
