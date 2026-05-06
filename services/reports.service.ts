import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { ReportDefinitionDto } from "@/types/reports.types";

export const reportsService = {
  async listDefinitions(): Promise<ReportDefinitionDto[]> {
    const res = await apiClient.get<ApiResponse<ReportDefinitionDto[]>>("/reports/definitions");
    return res.data.data;
  },
};
