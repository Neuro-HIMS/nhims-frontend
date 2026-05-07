import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  ReportDefinitionDto,
  ReportRunDhims2Dto,
  ReportRunMonthlyDto,
} from "@/types/reports.types";

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export const reportsService = {
  async listDefinitions(): Promise<ReportDefinitionDto[]> {
    const res = await apiClient.get<ApiResponse<ReportDefinitionDto[]>>("/reports/definitions");
    return res.data.data;
  },

  async listExportDefinitions(): Promise<ReportDefinitionDto[]> {
    const res = await apiClient.get<ApiResponse<ReportDefinitionDto[]>>("/reports/run/exports");
    return res.data.data;
  },

  async runDhims2(month?: string): Promise<ReportRunDhims2Dto> {
    const res = await apiClient.get<ApiResponse<ReportRunDhims2Dto>>("/reports/run/dhims2", {
      params: month ? { month } : {},
    });
    return res.data.data;
  },

  async runMonthly(month?: string): Promise<ReportRunMonthlyDto> {
    const res = await apiClient.get<ApiResponse<ReportRunMonthlyDto>>("/reports/run/monthly", {
      params: month ? { month } : {},
    });
    return res.data.data;
  },

  async downloadDhims2Csv(month: string): Promise<void> {
    const res = await apiClient.get("/reports/export/dhims2.csv", {
      params: { month },
      responseType: "blob",
    });
    triggerBlobDownload(res.data as Blob, `dhims2-${month}.csv`);
  },

  async downloadMonthlyCsv(month: string): Promise<void> {
    const res = await apiClient.get("/reports/export/monthly-summary.csv", {
      params: { month },
      responseType: "blob",
    });
    triggerBlobDownload(res.data as Blob, `monthly-summary-${month}.csv`);
  },
};
