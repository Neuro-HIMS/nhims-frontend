import { apiClient } from "./api-client";
import { useAuthStore } from "@/store/auth.store";
import type { ApiResponse } from "@/types/api.types";
import type { FacilitySettingsDto, FacilitySettingsUpdateRequest } from "@/types/facility.types";

// LEGACY(single-facility): remove when backend exposes /facility (see docs/agents/backend-gaps.md).
// The backend answers unmapped routes with 500 "Unexpected server error" rather than 404, so 500 counts too.
function isLegacyFallbackEligible(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405 || status === 500;
}

/** Remembered (per browser session) after the first fallback so later calls skip the missing `/facility` route. */
const LEGACY_FLAG_KEY = "nhims_facility_legacy_endpoint";

function readLegacyFlag(): boolean {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(LEGACY_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLegacyFlag() {
  try {
    sessionStorage.setItem(LEGACY_FLAG_KEY, "1");
  } catch {
    /* storage unavailable — fall back again next load */
  }
}

let useLegacyOnly = readLegacyFlag();

function warnLegacyFacilityEndpoint() {
  if (process.env.NODE_ENV === "development") {
    console.warn("[nhims] legacy facility endpoint in use");
  }
}

// LEGACY(single-facility): the session's facility id. The auth store lives in sessionStorage, so a
// fresh tab starts empty — ask the server rather than failing.
export async function resolveLegacyFacilityId(): Promise<string | undefined> {
  const fromStore = useAuthStore.getState().user?.facilityId;
  if (fromStore) return fromStore;
  const response = await apiClient.get<ApiResponse<{ facilityId?: string }>>("/auth/me");
  return response.data.data?.facilityId;
}

// LEGACY(single-facility): remove when backend exposes /facility.
async function withLegacyFacilityFallback<T>(
  request: () => Promise<T>,
  legacyRequest: (facilityId: string) => Promise<T>,
): Promise<T> {
  if (useLegacyOnly) {
    const facilityId = await resolveLegacyFacilityId();
    if (facilityId) return legacyRequest(facilityId);
  }
  try {
    return await request();
  } catch (err) {
    if (isLegacyFallbackEligible(err)) {
      const facilityId = await resolveLegacyFacilityId();
      if (facilityId) {
        useLegacyOnly = true;
        writeLegacyFlag();
        warnLegacyFacilityEndpoint();
        return legacyRequest(facilityId);
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
      async (facilityId) => {
        const response = await apiClient.get<ApiResponse<FacilitySettingsDto>>(`/facilities/${facilityId}`);
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
      async (facilityId) => {
        const response = await apiClient.put<ApiResponse<FacilitySettingsDto>>(`/facilities/${facilityId}`, body);
        return response.data.data;
      }
    );
  },
};
