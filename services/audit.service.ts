import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { AuditEventDto } from "@/types/audit.types";

export const auditApiService = {
  async listEvents(params?: { action?: string; limit?: number }): Promise<AuditEventDto[]> {
    const res = await apiClient.get<ApiResponse<AuditEventDto[]>>("/audit/events", {
      params: {
        action: params?.action,
        limit: params?.limit ?? 300,
      },
    });
    return res.data.data;
  },
};
