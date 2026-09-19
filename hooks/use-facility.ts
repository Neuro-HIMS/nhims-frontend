import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { facilityService } from "@/services/facility.service";

/**
 * The single source of facility identity (name, code, logo, level, contact, service
 * switches). NHIMS runs one facility per server, so this never takes an id.
 * Callers should fall back to the session's facility fields while this is loading.
 */
export function useFacility() {
  return useQuery({
    queryKey: queryKeys.facility.profile,
    queryFn: () => facilityService.get(),
    staleTime: 5 * 60_000,
  });
}
