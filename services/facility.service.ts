import { apiClient } from "./api-client";
import type { ApiResponse } from "@/types/api.types";
import type { FacilitySettingsDto, FacilitySettingsUpdateRequest } from "@/types/facility.types";

export const facilityService = {
  async get(facilityId: string): Promise<FacilitySettingsDto> {
    const response = await apiClient.get<ApiResponse<FacilitySettingsDto>>(`/facilities/${facilityId}`);
    return response.data.data;
  },

  async update(facilityId: string, body: FacilitySettingsUpdateRequest): Promise<FacilitySettingsDto> {
    const response = await apiClient.put<ApiResponse<FacilitySettingsDto>>(`/facilities/${facilityId}`, body);
    return response.data.data;
  },
};
