import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  IpdBoardDto,
  IpdMarEntryDto,
  IpdNursingOverviewDto,
  IpdTprReadingDto,
} from "@/types/ipd.types";

export const ipdService = {
  async board(): Promise<IpdBoardDto> {
    const res = await apiClient.get<ApiResponse<IpdBoardDto>>("/ipd/board");
    return res.data.data;
  },

  async nursingOverview(): Promise<IpdNursingOverviewDto> {
    const res = await apiClient.get<ApiResponse<IpdNursingOverviewDto>>("/ipd/nursing/overview");
    return res.data.data;
  },

  async listMar(admissionId: string): Promise<IpdMarEntryDto[]> {
    const res = await apiClient.get<ApiResponse<IpdMarEntryDto[]>>(
      `/ipd/nursing/admissions/${admissionId}/mar`,
    );
    return res.data.data;
  },

  async addMar(
    admissionId: string,
    body: { scheduledFor: string; drugDisplay: string; dose?: string; route?: string },
  ): Promise<IpdMarEntryDto> {
    const res = await apiClient.post<ApiResponse<IpdMarEntryDto>>(
      `/ipd/nursing/admissions/${admissionId}/mar`,
      body,
    );
    return res.data.data;
  },

  async listTpr(admissionId: string): Promise<IpdTprReadingDto[]> {
    const res = await apiClient.get<ApiResponse<IpdTprReadingDto[]>>(
      `/ipd/nursing/admissions/${admissionId}/tpr`,
    );
    return res.data.data;
  },

  async addTpr(
    admissionId: string,
    body: {
      recordedAt: string;
      tempC?: string;
      pulse?: string;
      respRate?: string;
      bpSys?: string;
      bpDia?: string;
      notes?: string;
    },
  ): Promise<IpdTprReadingDto> {
    const res = await apiClient.post<ApiResponse<IpdTprReadingDto>>(
      `/ipd/nursing/admissions/${admissionId}/tpr`,
      body,
    );
    return res.data.data;
  },
};
