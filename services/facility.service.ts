import { apiClient } from "./api-client";
import { useAuthStore } from "@/store/auth.store";
import type { ApiResponse } from "@/types/api.types";
import type { FacilitySettingsDto, FacilitySettingsUpdateRequest } from "@/types/facility.types";

// LEGACY(single-facility): remove when backend exposes /facility (see docs/agents/backend-gaps.md).
function isLegacyFallbackEligible(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405;
}

function warnLegacyFacilityEndpoint() {
  if (process.env.NODE_ENV === "development") {
    console.warn("[nhims] legacy facility endpoint in use");
  }
}

// LEGACY(single-facility): remove when backend exposes /facility.
async function withLegacyFacilityFallback<T>(request: () => Promise<T>, legacyRequest: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (err) {
    if (isLegacyFallbackEligible(err)) {
      const legacyFacilityId = useAuthStore.getState().user?.facilityId;
      if (legacyFacilityId) {
        warnLegacyFacilityEndpoint();
        return legacyRequest();
      }
    }
    throw err;
  }
}

export const facilityService = {
  /** NHIMS runs one facility per server — no facility id in the request. */
  async get(): Promise<FacilitySettingsDto> {
    return withLegacyFacilityFallback(
      async () => {
        const response = await apiClient.get<ApiResponse<FacilitySettingsDto>>("/facility");
        return response.data.data;
      },
      async () => {
        const legacyFacilityId = useAuthStore.getState().user?.facilityId;
        const response = await apiClient.get<ApiResponse<FacilitySettingsDto>>(`/facilities/${legacyFacilityId}`);
        return response.data.data;
      }
    );
  },

  async update(body: FacilitySettingsUpdateRequest): Promise<FacilitySettingsDto> {
    return withLegacyFacilityFallback(
      async () => {
        const response = await apiClient.put<ApiResponse<FacilitySettingsDto>>("/facility", body);
        return response.data.data;
      },
      async () => {
        const legacyFacilityId = useAuthStore.getState().user?.facilityId;
        const response = await apiClient.put<ApiResponse<FacilitySettingsDto>>(`/facilities/${legacyFacilityId}`, body);
        return response.data.data;
      }
    );
  },
};
